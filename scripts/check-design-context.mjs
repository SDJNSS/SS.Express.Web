import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { parseDocument } from 'yaml'

const projectRoot = process.cwd()
const registry = JSON.parse(
  readFileSync(resolve(projectRoot, 'standards/registry.json'), 'utf8'),
)
const designConfig = registry.designTokens
const designPath = resolve(projectRoot, designConfig.designContext)
const tokenPath = resolve(projectRoot, designConfig.runtimeSource)

function readFrontmatter(path) {
  const source = readFileSync(path, 'utf8')
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)

  if (!match?.[1]) {
    throw new Error(`${designConfig.designContext} 缺少 YAML frontmatter`)
  }

  const document = parseDocument(match[1], { schema: 'core', uniqueKeys: true })
  const diagnostics = [...document.errors, ...document.warnings]
  if (diagnostics.length) {
    throw new Error(
      `${designConfig.designContext} frontmatter 无法解析：${diagnostics
        .map((item) => item.message)
        .join('；')}`,
    )
  }

  return document.toJS({ maxAliasCount: 0 })
}

function readCssVariables(path) {
  const variables = new Map()
  const source = readFileSync(path, 'utf8')

  for (const match of source.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gimu)) {
    const [, name, value] = match
    if (name && value) variables.set(name, value.trim())
  }

  return variables
}

function valueAtPath(source, path) {
  return path.split('.').reduce((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return value[key]
  }, source)
}

function normalizeValue(value) {
  return value.replace(/\s*,\s*/gu, ', ').trim().toLowerCase()
}

const design = readFrontmatter(designPath)
const cssVariables = readCssVariables(tokenPath)
const errors = []

for (const [designKey, cssVariable] of Object.entries(designConfig.mappings)) {
  const documentedValue = valueAtPath(design, designKey)
  const runtimeValue = cssVariables.get(cssVariable)

  if (typeof documentedValue !== 'string') {
    errors.push(`${designKey} 在 DESIGN.md 中不存在或不是字符串`)
    continue
  }
  if (!runtimeValue) {
    errors.push(`${cssVariable} 在 ${designConfig.runtimeSource} 中不存在`)
    continue
  }
  if (normalizeValue(documentedValue) !== normalizeValue(runtimeValue)) {
    errors.push(`${designKey}=${documentedValue} 与 ${cssVariable}=${runtimeValue} 不一致`)
  }
}

if (errors.length) {
  console.error('DESIGN.md 与运行时 Design Token 发生漂移：')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `设计上下文映射检查通过：${Object.keys(designConfig.mappings).length} 个 DESIGN.md Token 与运行时唯一值源一致。`,
  )
}
