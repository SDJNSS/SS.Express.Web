import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { excludedSource } from './iam-maintenance-source.mjs'

// Parse literals only. Never evaluate/import business code during catalog discovery.
function literal(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression)
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return ts.isStringLiteral(node) ? node.text : Number(node.text)
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name))
        throw new Error('Resource registry must contain literal properties only')
      return [property.name.text, literal(property.initializer)]
    })
    if (new Set(entries.map(([key]) => key)).size !== entries.length)
      throw new Error('Duplicate registry property')
    return Object.fromEntries(entries)
  }
  throw new Error(`Non-literal resource registry expression: ${node.getText()}`)
}

export function parseResourceRegistry(source, path = 'iam-resource.registry.ts') {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  let registry
  const bindings = new Map()
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const item of statement.declarationList.declarations) {
      if (!ts.isIdentifier(item.name) || !item.initializer) continue
      if (item.name.text === 'resourceRegistry') registry = literal(item.initializer)
      const init = item.initializer
      if (ts.isCallExpression(init) && init.expression.getText(file) === 'bindResourceElements') {
        const arg = init.arguments[0]
        if (
          !arg ||
          !ts.isPropertyAccessExpression(arg) ||
          arg.expression.getText(file) !== 'resourceRegistry'
        )
          throw new Error(`Invalid resource binding in ${path}`)
        bindings.set(arg.name.text, item.name.text)
      }
    }
  }
  if (!registry) throw new Error(`Missing literal resourceRegistry: ${path}`)
  return Object.entries(registry).map(([key, page]) => {
    if (!bindings.has(key)) throw new Error(`Missing bound elements for ${path}:${key}`)
    return { ...page, registry_file: path, registry_key: key, binding: bindings.get(key) }
  })
}

export function readResourceRegistries(root) {
  const files = []
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink() || excludedSource(relative(root, path).replaceAll('\\', '/')))
        continue
      if (entry.isDirectory()) visit(path)
      else if (entry.name === 'iam-resource.registry.ts') files.push(path)
    }
  }
  // Archived and preview-only trees are not registry entry points.
  visit(join(root, 'src/features'))
  return files
    .sort()
    .flatMap((path) =>
      parseResourceRegistry(readFileSync(path, 'utf8'), relative(root, path).replaceAll('\\', '/')),
    )
}
