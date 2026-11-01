import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, posix } from 'node:path'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'

export const slash = (path) => path.replaceAll('\\', '/')
export const digest = (value) => createHash('sha256').update(value).digest('hex')
export const canonical = (value) => JSON.stringify(sortObject(value))
function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObject(value[key])]),
    )
  return value
}

export function excludedSource(path) {
  return (
    /(?:^|\/)(?:archive|UIDesign|preview|fixtures?|tests?|reference|node_modules|dist)(?:\/|$)/iu.test(
      path,
    ) || /(?:\.fixture\.|\.spec\.|\.test\.|\.d\.ts$|public\.preview\.)/u.test(path)
  )
}

export function sourceFiles(root, directory = 'src') {
  const result = []
  function walk(path) {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const file = `${path}/${entry.name}`
      if (entry.isSymbolicLink() || excludedSource(file)) continue
      if (entry.isDirectory()) walk(file)
      else if (/\.(vue|ts|tsx|js|jsx|mjs|cjs)$/u.test(file)) result.push(file)
    }
  }
  walk(directory)
  return result.sort()
}

export function resolveSource(root, file, specifier) {
  const name = specifier.startsWith('.')
    ? posix.normalize(`${posix.dirname(file)}/${specifier}`)
    : specifier.startsWith('@')
      ? `src/${specifier.replace(/^@\/?/u, '')}`
      : ''
  if (!name || name.startsWith('../') || excludedSource(name)) return undefined
  return [
    name,
    `${name}.ts`,
    `${name}.vue`,
    `${name}.js`,
    `${name}.mjs`,
    `${name}.cjs`,
    `${name}/index.ts`,
  ].find(
    (candidate) =>
      existsSync(join(root, candidate)) && /\.(ts|vue|js|tsx|jsx|mjs|cjs)$/u.test(candidate),
  )
}

export function unwrap(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isTypeAssertionExpression(node))
  )
    node = node.expression
  return node
}

// Restricted AST interpreter: constants, imports, Object.freeze and literal tuple maps only.
// No eval, dynamic import, execution of application code, login or network access.
export function constantReader(root) {
  const cache = new Map()
  function fileAst(file) {
    if (!cache.has(file))
      cache.set(
        file,
        ts.createSourceFile(
          file,
          readFileSync(join(root, file), 'utf8'),
          ts.ScriptTarget.Latest,
          true,
        ),
      )
    return cache.get(file)
  }
  function symbol(file, name, seen = new Set()) {
    const key = `${file}:${name}`
    if (seen.has(key)) throw new Error(`Cyclic/unresolved constant ${key}`)
    const next = new Set([...seen, key])
    const ast = fileAst(file)
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const item of statement.declarationList.declarations)
          if (item.name.getText(ast) === name && item.initializer)
            return value(file, item.initializer, {}, next)
      }
      if (ts.isImportDeclaration(statement) && statement.importClause) {
        const target = resolveSource(root, file, statement.moduleSpecifier.text)
        if (!target) continue
        if (statement.importClause.name?.text === name && target.endsWith('.vue'))
          return { component_file: target }
        const bindings = statement.importClause.namedBindings
        if (bindings && ts.isNamedImports(bindings)) {
          const binding = bindings.elements.find((item) => item.name.text === name)
          if (binding) return symbol(target, binding.propertyName?.text ?? name, next)
        }
      }
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        const binding = statement.exportClause.elements.find((item) => item.name.text === name)
        const target = resolveSource(root, file, statement.moduleSpecifier.text)
        if (binding && target) return symbol(target, binding.propertyName?.text ?? name, next)
      }
    }
    throw new Error(`Unresolved constant ${key}`)
  }
  function value(file, raw, env = {}, seen = new Set()) {
    const node = unwrap(raw)
    if (!node) return undefined
    if (ts.isStringLiteralLike(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (node.kind === ts.SyntaxKind.NullKeyword) return null
    if (ts.isIdentifier(node))
      return Object.hasOwn(env, node.text) ? env[node.text] : symbol(file, node.text, seen)
    if (ts.isPropertyAccessExpression(node)) {
      if (node.getText() === 'import.meta.env.DEV') return false
      const object = value(file, node.expression, env, seen)
      if (!Object.hasOwn(object ?? {}, node.name.text))
        throw new Error(`Unresolved property ${file}:${node.getText()}`)
      return object[node.name.text]
    }
    if (ts.isTemplateExpression(node))
      return (
        node.head.text +
        node.templateSpans
          .map((span) => String(value(file, span.expression, env, seen)) + span.literal.text)
          .join('')
      )
    if (ts.isConditionalExpression(node))
      return value(
        file,
        value(file, node.condition, env, seen) ? node.whenTrue : node.whenFalse,
        env,
        seen,
      )
    if (ts.isArrayLiteralExpression(node))
      return node.elements.flatMap((item) =>
        ts.isSpreadElement(item)
          ? value(file, item.expression, env, seen)
          : [value(file, item, env, seen)],
      )
    if (ts.isObjectLiteralExpression(node)) {
      const result = {}
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property))
          Object.assign(result, value(file, property.expression, env, seen))
        else if (ts.isPropertyAssignment(property)) {
          const key = property.name.getText().replace(/^['"]|['"]$/gu, '')
          // A redirect is not a new page. Preserve its expression as evidence without
          // interpreting a callback against an invented route/user context.
          result[key] =
            key === 'redirect' && ts.isArrowFunction(unwrap(property.initializer))
              ? { expression: property.initializer.getText(), dynamic: true }
              : value(file, property.initializer, env, seen)
        } else if (ts.isShorthandPropertyAssignment(property))
          result[property.name.text] = value(file, property.name, env, seen)
        else throw new Error(`Nonliteral property in ${file}`)
      }
      return result
    }
    if (
      ts.isArrowFunction(node) &&
      ts.isCallExpression(node.body) &&
      node.body.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const target = value(file, node.body.arguments[0], env, seen)
      const component = resolveSource(root, file, target)
      if (!component) throw new Error(`Missing route component ${file}:${target}`)
      return { component_file: component }
    }
    if (ts.isCallExpression(node) && node.expression.getText() === 'Object.freeze')
      return value(file, node.arguments[0], env, seen)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'map'
    ) {
      const rows = value(file, node.expression.expression, env, seen)
      const fn = node.arguments[0]
      if (!ts.isArrowFunction(fn) || !ts.isArrayBindingPattern(fn.parameters[0]?.name))
        throw new Error(`Dynamic route map ${file}`)
      return rows.map((row) => {
        const scope = { ...env }
        fn.parameters[0].name.elements.forEach((binding, index) => {
          scope[binding.name.text] = row[index]
        })
        return value(file, fn.body, scope, seen)
      })
    }
    throw new Error(`Dynamic/unresolved expression ${file}:${node.getText().slice(0, 120)}`)
  }
  return { fileAst, symbol, value }
}

export function discoverRoutes(root) {
  const reader = constantReader(root)
  const nodes = reader.symbol('src/app/router/index.ts', 'routes')
  const routes = []
  function visit(node, prefix = '') {
    const route = node.path.startsWith('/')
      ? node.path
      : `${prefix}/${node.path}`.replace(/\/+/gu, '/')
    if (node.component)
      routes.push({
        route_path: route || '/',
        route_name: node.name ?? '',
        component_file: node.component.component_file,
        shell: Boolean(node.children),
        meta: node.meta ?? {},
      })
    for (const child of node.children ?? []) visit(child, route === '/' ? '' : route)
  }
  nodes.forEach((node) => visit(node))
  const seen = new Set()
  for (const route of routes) {
    if (seen.has(route.route_path))
      throw new Error(`Duplicate production route ${route.route_path}`)
    seen.add(route.route_path)
  }
  return routes.sort((a, b) => a.route_path.localeCompare(b.route_path, 'en'))
}

const effect =
  /^(?:onMounted|onBeforeMount|onActivated|watch|watchEffect|watchPostEffect|setInterval|setTimeout|useQuery|useMutation)$/u
const network =
  /(?:^|\.)(?:fetch|requestApi|requestRaw|axios|httpClient|XMLHttpRequest|WebSocket|EventSource|requestUpload|postIam|postTraining|postFoundation)\b|(?:Api|Client|Transport|transport)\./u
const callback =
  /(?:remote|load|query|fetch|request|upload|download|export|submit|save|retry)|^(?:actions|columns|on[-A-Z].*|before-close)$/u

export function scanSource(file, source) {
  const candidates = []
  const imports = []
  const counts = new Map()
  function add(kind, expression, line, extra = {}) {
    const normalized = expression.replace(/\s+/gu, ' ').trim()
    const signature = digest(canonical({ kind, expression: normalized, ...extra })).slice(0, 16)
    const occurrence = counts.get(signature) ?? 0
    counts.set(signature, occurrence + 1)
    candidates.push({
      candidate_id: `${file}#${kind}:${signature}:${occurrence}`,
      file,
      line,
      kind,
      expression: normalized,
      ...extra,
    })
  }
  function script(content, offset = 0) {
    const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
    if (ast.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`)
    const aliases = new Map()
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) continue
      const clause = statement.importClause
      if (statement.moduleSpecifier.text === 'axios' && clause.name)
        aliases.set(clause.name.text, 'axios')
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const binding of clause.namedBindings.elements)
          aliases.set(binding.name.text, binding.propertyName?.text ?? binding.name.text)
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        !node.isTypeOnly &&
        !node.importClause?.isTypeOnly
      )
        imports.push(node.moduleSpecifier.text)
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callee = node.expression.getText(ast)
        const resolvedCallee = callee.replace(/^[\w$]+/u, (head) => aliases.get(head) ?? head)
        const line = offset + ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1
        if (effect.test(resolvedCallee)) add('lifecycle', node.getText(ast), line)
        else if (/^(?:inject|provide)$/u.test(resolvedCallee) || /\.provide$/u.test(callee))
          add('injection', node.getText(ast), line, {
            injection_role: /(?:^|\.)provide$/u.test(resolvedCallee) ? 'provider' : 'consumer',
            injection_key:
              node.arguments?.[0]
                ?.getText(ast)
                .replace(/^[\w$]+/u, (head) => aliases.get(head) ?? head) ?? '',
          })
        else if (network.test(resolvedCallee) || /navigator\.sendBeacon$/u.test(callee))
          add('request', node.getText(ast), line)
        else if (/\.(?:addRoute|removeRoute)$/u.test(callee))
          add('dynamic-route', node.getText(ast), line)
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0]) {
          if (ts.isStringLiteralLike(node.arguments[0])) imports.push(node.arguments[0].text)
          else add('dynamic-import', node.getText(ast), line)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  if (file.endsWith('.vue')) {
    // Read directive text, not Babel's JavaScript-only interpretation of template
    // expressions. vue-tsc/ESLint validate TypeScript assertions in templates.
    const { descriptor, errors } = parse(source, {
      filename: file,
      templateParseOptions: { prefixIdentifiers: false },
    })
    if (errors.length) throw new Error(`Cannot parse ${file}: ${errors.join(', ')}`)
    for (const block of [descriptor.script, descriptor.scriptSetup])
      if (block) script(block.content, block.loc.start.line - 1)
    function visit(node) {
      if (node.type !== 1) return
      const marker =
        node.props.find(
          (p) =>
            p.type === 7 &&
            (p.name === 'resource-element' ||
              (p.name === 'bind' && p.arg?.content === 'resource_element') ||
              (p.name === 'bind' &&
                !p.arg &&
                p.exp?.content.startsWith('resourceElementAttributes('))),
        )?.exp?.content ?? ''
      for (const prop of node.props) {
        if (prop.type === 6 && prop.name === 'action' && prop.value)
          add('request', prop.value.content, prop.loc.start.line, {
            tag: node.tag,
            event: 'native-action',
            marker,
          })
        if (prop.type !== 7) continue
        if (
          prop.name === 'on' ||
          prop.name === 'model' ||
          (prop.name === 'bind' && callback.test(prop.arg?.content ?? ''))
        )
          add('ui-event', prop.exp?.content ?? '', prop.loc.start.line, {
            tag: node.tag,
            event: prop.arg?.content ?? prop.name,
            marker,
          })
      }
      for (const child of node.children ?? []) visit(child)
    }
    for (const node of descriptor.template?.ast.children ?? []) visit(node)
  } else script(source)
  return { candidates, imports }
}

export function discoverCommunications(root) {
  const files = sourceFiles(root)
  const sources = []
  const candidates = []
  const dependencies = {}
  for (const file of files) {
    const source = readFileSync(join(root, file), 'utf8')
    sources.push({ file, sha256: digest(source.replace(/\r\n/gu, '\n')) })
    const scanned = scanSource(file, source)
    candidates.push(...scanned.candidates)
    dependencies[file] = [
      ...new Set(scanned.imports.map((item) => resolveSource(root, file, item)).filter(Boolean)),
    ].sort()
  }
  return { sources, candidates, dependencies }
}

export function dependencyClosure(entry, dependencies) {
  const visited = new Set()
  function visit(file) {
    if (visited.has(file)) return
    visited.add(file)
    for (const next of dependencies[file] ?? []) visit(next)
  }
  visit(entry)
  return [...visited].sort()
}

// Injection is wired outside an importer's closure. Conservatively bind every
// provider whenever a reviewed closure consumes injection; explicit chain
// dependencies may narrow the semantic explanation but never erase this guard.
export function communicationDependencies(source, entries) {
  const files = new Set(
    entries.flatMap((entry) => dependencyClosure(entry, source.dependencies ?? {})),
  )
  if (source.candidates.some((c) => files.has(c.file) && c.injection_role === 'consumer')) {
    for (const provider of source.candidates.filter((c) => c.injection_role === 'provider'))
      for (const file of dependencyClosure(provider.file, source.dependencies ?? {}))
        files.add(file)
  }
  const hashes = new Map(source.sources.map((item) => [item.file, item.sha256]))
  return [...files].sort().map((file) => {
    if (!hashes.has(file)) throw new Error(`Missing communication dependency source: ${file}`)
    return { file, sha256: hashes.get(file) }
  })
}

export function communicationDependencyHash(source, entries) {
  return digest(canonical(communicationDependencies(source, entries)))
}
