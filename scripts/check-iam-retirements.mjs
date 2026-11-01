import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export function checkIamRetirements(projectRoot = root) {
  const registry = JSON.parse(
    readFileSync(resolve(projectRoot, 'standards/iam-retirements.json'), 'utf8'),
  )
  const findings = []
  const files = []
  function walk(directory) {
    if (!existsSync(directory)) return
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name)
      if (item.isDirectory()) walk(path)
      else if (/\.(?:ts|vue)$/u.test(item.name)) files.push(path)
    }
  }
  walk(resolve(projectRoot, 'src'))
  walk(resolve(projectRoot, 'UIDesign/src'))
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const name = relative(projectRoot, file).replaceAll('\\', '/')
    if (/\b(?:import|export)[\s\S]*?(?:['"]|\/)archive\//u.test(source)) {
      findings.push(`${name}: production/preview cannot import archived code`)
    }
    if (file.endsWith('/routes.ts') || file.endsWith('\\routes.ts')) {
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
      function visit(node) {
        if (
          ts.isPropertyAssignment(node) &&
          node.name.getText(sf) === 'path' &&
          ts.isStringLiteral(node.initializer)
        ) {
          const path = `/${node.initializer.text.replace(/^\//u, '')}`
          if (registry.pages.some((page) => page.route_path === path))
            findings.push(`${name}: retired route ${path}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
  }
  const preview = readFileSync(resolve(projectRoot, 'UIDesign/src/prototype-registry.ts'), 'utf8')
  const catalog = JSON.parse(
    readFileSync(resolve(projectRoot, 'artifacts/iam-resource-catalog.json'), 'utf8'),
  )
  const retiredCodes = new Set(registry.pages.map((page) => page.resource_code))
  function checkResources(value) {
    if (!value || typeof value !== 'object') return
    if (retiredCodes.has(value.resource_code))
      findings.push(`catalog: retired resource ${value.resource_code}`)
    if (typeof value.component === 'string' && value.component.split('/').includes('archive'))
      findings.push(`catalog: archived component ${value.component}`)
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(checkResources)
      else if (child && typeof child === 'object') checkResources(child)
    }
  }
  checkResources(catalog)
  for (const page of registry.pages) {
    if (preview.includes(`id: '${page.page_id}'`))
      findings.push(`preview: retired page ${page.page_id}`)
    if (existsSync(resolve(projectRoot, `docs/page-specs/${page.page_id}.yaml`)))
      findings.push(`active contract: ${page.page_id}`)
    if (
      !existsSync(
        resolve(
          projectRoot,
          page.archive_root ?? registry.archive_root,
          `docs/page-specs/${page.page_id}.yaml`,
        ),
      )
    )
      findings.push(`missing archived contract: ${page.page_id}`)
  }
  const activeRoutes = readFileSync(resolve(projectRoot, 'src/features/iam/routes.ts'), 'utf8')
  for (const component of registry.retired_components ?? []) {
    if (existsSync(resolve(projectRoot, 'src/features', `${component}.vue`)))
      findings.push(`retired component remains in src: ${component}`)
    if (activeRoutes.includes(component))
      findings.push(`retired component registered: ${component}`)
  }
  return {
    status: findings.length ? 'failed' : 'passed',
    retired_pages: registry.pages.length,
    findings,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkIamRetirements()
  console.log(JSON.stringify(result))
  if (result.findings.length) process.exitCode = 1
}
