import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const projectRoot = process.cwd()
const manifestPath = 'UIDesign/approved-prototypes.json'
const registryPath = 'standards/registry.json'
const errors = []

function readProjectFile(path) {
  return readFileSync(resolve(projectRoot, path), 'utf8')
}

function yamlBlock(source, key) {
  const lines = source.split(/\r?\n/u)
  const start = lines.findIndex((line) => line.trim() === `${key}:`)
  if (start < 0) return ''

  const block = []
  for (const line of lines.slice(start + 1)) {
    if (line && !/^\s/u.test(line)) break
    block.push(line)
  }
  return block.join('\n')
}

function yamlScalar(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, 'mu'))
  return match?.[1]?.replace(/^['"]|['"]$/gu, '') ?? ''
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

if (!existsSync(resolve(projectRoot, registryPath))) {
  console.error(`前端标准 Registry 不存在：${registryPath}`)
  process.exit(1)
}

if (!existsSync(resolve(projectRoot, manifestPath))) {
  console.error(`原型治理清单不存在：${manifestPath}`)
  process.exit(1)
}

const registry = JSON.parse(readProjectFile(registryPath))
const expectedViewports = registry.viewports
const legacyPageSpecs = registry.pageContract.legacySpecs
const manifest = JSON.parse(readProjectFile(manifestPath))
const actualViewportSignature = JSON.stringify(manifest.viewports)
const expectedViewportSignature = JSON.stringify(expectedViewports)
if (actualViewportSignature !== expectedViewportSignature) {
  errors.push(`approved-prototypes.json 的兼容视口镜像必须与 ${registryPath} 完全一致`)
}

const pageSpecDirectory = resolve(projectRoot, 'docs/page-specs')
const allPageSpecs = readdirSync(pageSpecDirectory)
  .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
  .map((file) => `docs/page-specs/${file}`)
const pageSpecs = legacyPageSpecs.filter((path) => {
  if (allPageSpecs.includes(path)) return true
  errors.push(`${registryPath} 登记的 Legacy Page Specification 不存在：${path}`)
  return false
})

for (const pageSpecPath of pageSpecs) {
  const source = readProjectFile(pageSpecPath)
  const pageBlock = yamlBlock(source, 'page')
  const prototypeBlock = yamlBlock(source, 'prototype')
  const visualBlock = yamlBlock(source, 'visual')
  const pageId = yamlScalar(pageBlock, 'id')
  const pageType = yamlScalar(pageBlock, 'type')
  const route = yamlScalar(source, 'route')
  const prototypeId = yamlScalar(prototypeBlock, 'id')
  const requiredStatus = yamlScalar(prototypeBlock, 'requiredStatus')
  const declaredManifest = yamlScalar(prototypeBlock, 'manifest')
  const visualBaseline = yamlScalar(visualBlock, 'baseline')
  const visualViewports = yamlScalar(visualBlock, 'viewports')

  if (!pageId || !pageType || !route || !prototypeId) {
    errors.push(`${pageSpecPath} 缺少 page.id、page.type、route 或 prototype.id`)
    continue
  }
  if (requiredStatus !== 'approved' || declaredManifest !== manifestPath) {
    errors.push(`${pageSpecPath} 必须要求 approved 状态并指向 ${manifestPath}`)
  }

  const matches = manifest.prototypes.filter((prototype) => prototype.id === prototypeId)
  if (matches.length !== 1) {
    errors.push(`${pageSpecPath} 必须唯一关联原型 ${prototypeId}`)
    continue
  }

  const prototype = matches[0]
  if (prototype.id !== pageId) errors.push(`${pageSpecPath} 的 page.id 必须与 prototype.id 一致`)
  if (prototype.status !== 'approved') errors.push(`${prototype.id} 尚未进入 approved 状态`)
  if (prototype.pageSpec !== pageSpecPath)
    errors.push(`${prototype.id} 关联的 Page Specification 不一致`)
  if (prototype.pageType !== pageType)
    errors.push(`${prototype.id} 的 Page Type 与 Page Specification 不一致`)
  if (prototype.productionRoute !== route)
    errors.push(`${prototype.id} 的生产路由与 Page Specification 不一致`)
  if (prototype.baselineDirectory !== visualBaseline)
    errors.push(`${prototype.id} 的视觉基线目录声明不一致`)

  for (const viewport of expectedViewports) {
    const yamlViewport = `${viewport.width}x${viewport.height}`
    if (!visualViewports.includes(yamlViewport)) {
      errors.push(`${pageSpecPath} 未声明视觉视口 ${yamlViewport}`)
    }
  }

  for (const pathKey of [
    'routeSource',
    'productionPage',
    'prototypeComponent',
    'approvedReference',
  ]) {
    const path = prototype[pathKey]
    if (!path || !existsSync(resolve(projectRoot, path))) {
      errors.push(`${prototype.id} 的 ${pathKey} 文件不存在：${path ?? '<empty>'}`)
    }
  }

  if (existsSync(resolve(projectRoot, prototype.productionPage))) {
    const productionSource = readProjectFile(prototype.productionPage)
    if (!productionSource.includes(prototype.pattern)) {
      errors.push(`${prototype.productionPage} 未使用登记 Pattern ${prototype.pattern}`)
    }
  }

  if (existsSync(resolve(projectRoot, prototype.routeSource))) {
    const routeSource = readProjectFile(prototype.routeSource)
    const routePattern = new RegExp(
      `path:\\s*['"]${escapeRegex(route.replace(/^\//u, ''))}['"]`,
      'u',
    )
    if (!routePattern.test(routeSource)) {
      errors.push(`${prototype.routeSource} 未注册生产路由 ${route}`)
    }
    if (!routeSource.includes(basename(prototype.productionPage))) {
      errors.push(`${prototype.routeSource} 未装载生产页面 ${prototype.productionPage}`)
    }
  }

  for (const viewport of expectedViewports) {
    const baseline = resolve(projectRoot, prototype.baselineDirectory, `${viewport.id}.png`)
    if (!existsSync(baseline)) {
      errors.push(`${prototype.id} 缺少视觉基线 ${prototype.baselineDirectory}/${viewport.id}.png`)
    }
  }
}

for (const prototype of manifest.prototypes) {
  if (!pageSpecs.includes(prototype.pageSpec)) {
    errors.push(`${prototype.id} 关联了不存在于 docs/page-specs 的规格：${prototype.pageSpec}`)
  }
}

if (errors.length) {
  console.error('原型治理关联检查失败：')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    'Legacy 原型治理关联检查通过：Page Specification、approved 原型、生产路由和视觉基线已闭环。',
  )
}
