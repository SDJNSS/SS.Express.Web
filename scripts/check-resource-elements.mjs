import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'vue/compiler-sfc'
import ts from 'typescript'
import { readResourceRegistries } from './lib/resource-registries.mjs'
import { discoverRoutes } from './lib/iam-maintenance-source.mjs'
import { requireResourceDescription } from './lib/resource-descriptions.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requiredControls = new Set([
  'AppPage',
  'button',
  'el-button',
  'FormDrawer',
  'DetailDrawer',
  'SearchPanel',
  'TableToolbar',
  'AppPagination',
  'ImageAssetField',
  'OrganizationLeaderSelector',
  'PagedEntitySelect',
  'ConfirmAction',
  'el-dialog',
])

export function inspectResourceMarkers(source, file, page) {
  const { descriptor, errors } = parse(source, { filename: file })
  if (errors.length) throw new Error(`Invalid Vue source: ${file}`)
  const evidence = []
  function visit(node) {
    if (node.type !== 1) return
    const markers = node.props.filter(
      (p) =>
        p.type === 7 &&
        (p.name === 'resource-element' ||
          (p.name === 'bind' && p.arg?.content === 'resource_element') ||
          (p.name === 'bind' &&
            !p.arg &&
            p.exp?.content.trim().startsWith('resourceElementAttributes('))),
    )
    if (requiredControls.has(node.tag) && markers.length !== 1)
      throw new Error(
        `${file}:${node.loc.start.line} ${node.tag} requires one resource_element marker`,
      )
    for (const marker of markers) {
      if (['el-dialog', 'el-drawer'].includes(node.tag) && marker.name === 'resource-element')
        throw new Error(
          `${file}:${node.loc.start.line} teleport root requires resourceElementAttributes, not a runtime directive`,
        )
      const expression = marker.exp?.content ?? ''
      const expressionFile = ts.createSourceFile(
        'marker.ts',
        `const value = ${expression}`,
        ts.ScriptTarget.Latest,
        true,
      )
      const keys = new Set()
      function scan(n) {
        if (ts.isParenthesizedExpression(n)) return scan(n.expression)
        if (ts.isConditionalExpression(n)) {
          scan(n.whenTrue)
          scan(n.whenFalse)
          return
        }
        if (
          ts.isCallExpression(n) &&
          n.expression.getText(expressionFile) === 'resourceElementAttributes' &&
          n.arguments.length === 1
        )
          return scan(n.arguments[0])
        if (
          ts.isPropertyAccessExpression(n) &&
          n.expression.getText(expressionFile) === page.binding
        ) {
          keys.add(n.name.text)
          return
        }
        throw new Error(`${file}:${node.loc.start.line} dynamic/unregistered marker`)
      }
      scan(expressionFile.statements[0].declarationList.declarations[0].initializer)
      if (!keys.size)
        throw new Error(`${file}:${node.loc.start.line} marker must reference ${page.binding}`)
      for (const key of keys) {
        if (!page.elements[key])
          throw new Error(`${file}:${node.loc.start.line} unknown element ${key}`)
        evidence.push({
          resource_element: page.elements[key].resource_element,
          file,
          line: node.loc.start.line,
          tag: node.tag,
        })
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  for (const child of descriptor.template?.ast?.children ?? []) visit(child)
  return evidence
}

export function buildResourceElements(projectRoot = root) {
  const pages = readResourceRegistries(projectRoot)
  const routes = discoverRoutes(projectRoot)
  const ids = new Set()
  const codes = new Set()
  const catalog = JSON.parse(
    readFileSync(join(projectRoot, 'artifacts/iam-resource-catalog.json'), 'utf8'),
  )
  const catalogResources = new Map()
  function collect(node, parent) {
    if (node.resource_code) catalogResources.set(node.resource_code, { ...node, parent })
    for (const key of ['apps', 'modules', 'menus', 'pages', 'buttons', 'functions'])
      for (const child of node[key] ?? []) collect(child, node.resource_code)
  }
  collect(catalog)
  for (const page of pages) {
    requireResourceDescription(page.remarks, page.resource_code)
    if (!page.route_path || !page.view_files?.length)
      throw new Error(`Missing page evidence: ${page.resource_code}`)
    const menu = catalogResources.get(page.resource_code)
    if (
      !menu ||
      menu.route_path !== page.route_path ||
      menu.component !== page.component ||
      menu.resource_type !== (page.resource_type ?? 'menu')
    )
      throw new Error(`Page/catalog mismatch: ${page.resource_code}`)
    if (!existsSync(join(projectRoot, 'src/features', page.component + '.vue')))
      throw new Error(`Missing production component: ${page.component}`)
    for (const code of [
      page.resource_code,
      ...Object.values(page.buttons).map((b) => b.resource_code),
    ]) {
      if (!code || codes.has(code)) throw new Error(`Duplicate/missing frontend code: ${code}`)
      codes.add(code)
    }
    for (const button of Object.values(page.buttons)) {
      requireResourceDescription(button.remarks, button.resource_code)
      const resource = catalogResources.get(button.resource_code)
      if (resource?.resource_type !== 'button' || resource.parent !== page.resource_code)
        throw new Error(`Button/catalog parent mismatch: ${button.resource_code}`)
    }
    for (const element of Object.values(page.elements)) {
      if (!element.resource_element || ids.has(element.resource_element))
        throw new Error(`Duplicate/missing element: ${element.resource_element}`)
      ids.add(element.resource_element)
      if (element.resource_key !== 'page' && !page.buttons[element.resource_key])
        throw new Error(`Unknown resource_key: ${element.resource_element}`)
      if (element.target_resource_code && !catalogResources.has(element.target_resource_code))
        throw new Error(`Unknown navigation target: ${element.target_resource_code}`)
      if (element.target_resource_code || element.remarks !== undefined)
        requireResourceDescription(element.remarks, element.resource_element)
      for (const apis of Object.values(element.events))
        for (const api of apis)
          if (!/^(GET|POST|PUT|PATCH|DELETE) \/[\w/.-]+$/.test(api))
            throw new Error(`Invalid API identity: ${api}`)
    }
    page.evidence = page.view_files.flatMap((file) => {
      const feature = dirname(page.registry_file).replaceAll('\\', '/')
      const productionPage =
        file === `src/features/${page.component}.vue` &&
        file.startsWith(feature + '/pages/') &&
        routes.some(
          (route) => route.route_path === page.route_path && route.component_file === file,
        )
      if (!file.startsWith(feature + '/components/') && !productionPage)
        throw new Error(`Invalid canonical view: ${file}`)
      return inspectResourceMarkers(readFileSync(join(projectRoot, file), 'utf8'), file, page)
    })
    const marked = new Set(page.evidence.map((e) => e.resource_element))
    for (const key of Object.keys(page.buttons)) {
      if (
        !Object.values(page.elements).some(
          (e) => e.resource_key === key && marked.has(e.resource_element),
        )
      )
        throw new Error(`Button has no UI evidence: ${page.buttons[key].resource_code}`)
    }
    // Explicit declarations, not a claim that all indirect communications were proven.
    page.backend_function_mapping_complete = false
  }
  return {
    schema_version: 1,
    scope: 'registered-production-pages',
    permission_template_ready: false,
    notes: [
      'Resource markers are metadata, not authorization.',
      'Backend Function codes and full communication coverage require the maintenance audit.',
    ],
    pages,
  }
}

function main() {
  const artifact = buildResourceElements()
  const path = join(root, 'artifacts/iam-resource-elements.json')
  const result = JSON.stringify(artifact, null, 2) + '\n'
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, result, 'utf8')
  } else if (!existsSync(path) || readFileSync(path, 'utf8') !== result) {
    throw new Error('Resource element artifact is stale; run pnpm resource-elements:generate')
  }
  console.log(
    `Resource elements: ${artifact.pages.length} pages / ${artifact.pages.reduce((n, p) => n + Object.keys(p.buttons).length, 0)} business Buttons; marker checks passed`,
  )
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
