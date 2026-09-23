import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import ts from 'typescript'

const projectRoot = process.cwd()
const sourceRoots = ['src', 'UIDesign/src']
const sourceExtensions = new Set(['.css', '.scss', '.ts', '.vue'])
const tokenFile = 'src/shared/styles/tokens.scss'
const iconRegistryFile = 'src/shared/icons/registerIcons.ts'
const httpClientFile = 'src/shared/api/httpClient.ts'
const standardsRegistryFile = resolve(projectRoot, 'standards/registry.json')
const certifiedFullPageComponents = new Set([
  'src/shared/business-components/FeatureScaffoldPage.vue',
  'src/shared/business-components/SubsystemWorkspace.vue',
])
const violations = []
const iconReferences = []

function loadStandalonePageTemplates() {
  if (!existsSync(standardsRegistryFile)) return new Set(['AuthPageTemplate'])

  try {
    const registry = JSON.parse(readFileSync(standardsRegistryFile, 'utf8'))
    return new Set(
      Object.entries(registry.patterns ?? {})
        .filter(([, pattern]) => pattern?.shellMode === 'standalone')
        .map(([patternName]) => patternName),
    )
  } catch {
    return new Set(['AuthPageTemplate'])
  }
}

const standalonePageTemplates = loadStandalonePageTemplates()

function normalizePath(path) {
  return path.split(sep).join('/')
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function report(rule, file, line, message) {
  violations.push(`${normalizePath(relative(projectRoot, file))}:${line} [${rule}] ${message}`)
}

function checkStyles(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  const isTokenFile = relativePath === tokenFile

  content.split(/\r?\n/u).forEach((line, index) => {
    if (line.includes('standards-allow')) return

    const lineNumber = index + 1
    if (!isTokenFile && /#[\da-f]{3,8}\b|rgba?\(/iu.test(line)) {
      report('design-token', file, lineNumber, '颜色只能在 tokens.scss 中定义')
    }
    if (
      !isTokenFile &&
      /\b(?:color|background(?:-color)?|border(?:-color)?)\s*:\s*(?:white|black)\b/iu.test(line)
    ) {
      report('design-token', file, lineNumber, '命名颜色必须替换为语义 Design Token')
    }
    if (!isTokenFile && /\bfont-size\s*:\s*-?\d/u.test(line)) {
      report('design-token', file, lineNumber, '字号必须使用 Design Token')
    }
    if (!isTokenFile && /\bfontSize\s*:\s*-?\d/u.test(line)) {
      report('design-token', file, lineNumber, '脚本中的字号必须来自运行时 Design Token')
    }
    if (
      !isTokenFile &&
      /\b(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left))?\s*:[^;]*-?\d+(?:\.\d+)?px/iu.test(
        line,
      )
    ) {
      report('design-token', file, lineNumber, '间距必须使用 4px 网格 Design Token')
    }
    if (!isTokenFile && /\bborder-radius\s*:[^;]*-?\d+(?:\.\d+)?px/iu.test(line)) {
      report('design-token', file, lineNumber, '圆角必须使用 Design Token')
    }
    if (
      !isTokenFile &&
      /\bbox-shadow\s*:/iu.test(line) &&
      !/\bbox-shadow\s*:[^;]*(?:var\(|none)/iu.test(line)
    ) {
      report('design-token', file, lineNumber, '阴影必须使用 Design Token')
    }
    if (extname(file) === '.vue' && /\sstyle\s*=\s*["']/u.test(line)) {
      report('inline-style', file, lineNumber, '禁止在 Vue 模板中使用字面量 style 属性')
    }
  })
}

function collectIconReferences(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  if (relativePath === iconRegistryFile) return

  for (const match of content.matchAll(/mdi:([a-z0-9-]+)/gu)) {
    iconReferences.push({
      file,
      line: content.slice(0, match.index).split(/\r?\n/u).length,
      name: match[1],
    })
  }
}

function checkIamVersionTokens(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  if (!relativePath.startsWith('src/features/iam/')) return

  content.split(/\r?\n/u).forEach((line, index) => {
    if (line.includes('standards-allow')) return

    const lineNumber = index + 1
    if (/\b(?:version|[A-Za-z]+Version|[a-z_]+_version)\??\s*:\s*number\b/u.test(line)) {
      report(
        'iam-version-token',
        file,
        lineNumber,
        'IAM 并发版本必须使用 VersionToken 字符串，禁止声明为 number',
      )
    }
    if (
      /\b(?:Number|parseInt|parseFloat|String)\s*\([^\r\n)]*(?:version|Version|_version)\b/u.test(
        line,
      ) ||
      /\+\s*(?:[A-Za-z_$][\w$]*\.)*(?:version|[A-Za-z]+Version|[a-z_]+_version)\b/u.test(line)
    ) {
      report(
        'iam-version-token',
        file,
        lineNumber,
        'IAM 并发版本是不可解析的不透明字符串，禁止数值转换或补救式字符串转换',
      )
    }
  })
}

function checkRouteImplementationStatus(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  if (!/^src\/features\/.+\/routes\.ts$/u.test(relativePath)) return

  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
  const property = (object, name) =>
    object?.properties.find(
      (item) =>
        ts.isPropertyAssignment(item) &&
        ((ts.isIdentifier(item.name) && item.name.text === name) ||
          (ts.isStringLiteralLike(item.name) && item.name.text === name)),
    )

  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const component = property(node, 'component')
      const meta = property(node, 'meta')
      const metaObject =
        meta && ts.isPropertyAssignment(meta) && ts.isObjectLiteralExpression(meta.initializer)
          ? meta.initializer
          : undefined
      const status = property(metaObject, 'implementationStatus')
      const statusValue =
        status && ts.isPropertyAssignment(status) && ts.isStringLiteralLike(status.initializer)
          ? status.initializer.text
          : ''
      const usesScaffold = Boolean(
        component?.getText(sourceFile).includes('FeatureScaffoldPage.vue'),
      )

      if (usesScaffold !== (statusValue === 'placeholder')) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
        report(
          'route-implementation-status',
          file,
          line,
          'FeatureScaffoldPage 占位路由必须在同一路由对象声明 meta.implementationStatus = placeholder，且真实页面不得保留该标记',
        )
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function checkReferenceRouteRegistration(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  if (
    relativePath === 'src/app/router/index.ts' &&
    content.includes('referenceRoutes') &&
    (!/import\.meta\.env\.DEV\s*\?\s*referenceRoutes\s*:\s*\[\]/u.test(content) ||
      /\.\.\.referenceRoutes\b/u.test(content))
  ) {
    report(
      'reference-route-environment',
      file,
      1,
      'Reference 示例路由只能通过 import.meta.env.DEV 在开发环境注册',
    )
  }

  if (
    relativePath === 'src/app/composables/useAppShellContext.ts' &&
    content.includes('import.meta.glob') &&
    !content.includes('!../../features/reference/**/*.vue')
  ) {
    report(
      'reference-route-environment',
      file,
      1,
      '生产动态页面模块映射必须显式排除 src/features/reference/**',
    )
  }
}

function featureIdentity(path) {
  const parts = normalizePath(path).split('/')
  const featureIndex = parts.indexOf('features')
  if (featureIndex < 0) return null

  const domainParts = parts.slice(featureIndex + 1)
  if (domainParts.length < 2) return null
  const featureLayerNames = new Set([
    'api',
    'components',
    'composables',
    'pages',
    'preview',
    'store',
    'stores',
    'types',
  ])
  const secondPart = domainParts[1]
  const isSingleLevelFeature =
    featureLayerNames.has(secondPart) ||
    /^(?:public(?:\.preview)?|routes)(?:\.[^/]+)?$/u.test(secondPart)

  return isSingleLevelFeature ? domainParts[0] : `${domainParts[0]}/${secondPart}`
}

function resolveImport(importer, specifier) {
  if (specifier.startsWith('@feature-preview/')) {
    return resolve(projectRoot, 'src/features', specifier.slice('@feature-preview/'.length))
  }
  if (specifier.startsWith('@features/')) {
    return resolve(projectRoot, 'src/features', specifier.slice('@features/'.length))
  }
  if (specifier.startsWith('@shared/')) {
    return resolve(projectRoot, 'src/shared', specifier.slice('@shared/'.length))
  }
  if (specifier.startsWith('.')) {
    return resolve(dirname(importer), specifier)
  }
  return null
}

function isFeatureTarget(path) {
  return normalizePath(relative(projectRoot, path)).startsWith('src/features/')
}

function isPublicPreviewEntry(path) {
  const relativePath = normalizePath(relative(projectRoot, path))
  return /^src\/features\/[^/]+\/[^/]+\/public\.preview(?:\.(?:[cm]?[jt]sx?))?$/u.test(relativePath)
}

function isPreviewSource(relativePath) {
  return /^src\/features\/[^/]+\/[^/]+\/(?:public\.preview(?:\.[^/]+)?|preview\/)/u.test(
    relativePath,
  )
}

function isForbiddenPreviewDependency(targetRelative, specifier) {
  return (
    specifier === 'axios' ||
    specifier === '@shared/api' ||
    specifier.startsWith('@shared/api/') ||
    /(?:^|\/)(?:api|store|stores|routes)(?:\/|\.|$)/u.test(targetRelative)
  )
}

function checkImports(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  const importerFeature = featureIdentity(relativePath)
  const uiDesignSource = relativePath.startsWith('UIDesign/')
  const previewSource = isPreviewSource(relativePath)
  const publicPreviewEntry = isPublicPreviewEntry(file)
  const isSubsystemRouteAggregator = /^src\/features\/[^/]+\/routes\.ts$/u.test(relativePath)
  const isFeatureApiSource = /^src\/features\/[^/]+\/[^/]+\/api\//u.test(relativePath)
  const importPattern = /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/gu

  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1]
    if (!specifier) continue

    const target = resolveImport(file, specifier)
    const targetRelative = target ? normalizePath(relative(projectRoot, target)) : ''

    if (specifier === 'axios' && relativePath !== httpClientFile) {
      report('http-client-owner', file, 1, '只有 src/shared/api/httpClient.ts 可以直接导入 Axios')
      continue
    }

    if (
      relativePath.startsWith('src/features/') &&
      !previewSource &&
      !isFeatureApiSource &&
      (specifier === '@shared/api' || specifier.startsWith('@shared/api/'))
    ) {
      report('api-layer', file, 1, 'Feature 只能从本 Feature 的 api/ 目录访问统一 HTTP Client')
      continue
    }

    if (
      relativePath.startsWith('src/features/') &&
      !previewSource &&
      (/^@shared\/components\/AppShell(?:\.vue)?$/u.test(specifier) ||
        targetRelative === 'src/shared/components/AppShell.vue')
    ) {
      report(
        'page-shell-ownership',
        file,
        1,
        'Feature 禁止装配 AppShell；生产壳层只能由 AppLayout 持有',
      )
      continue
    }

    if (importerFeature && specifier.startsWith('@app/')) {
      report('feature-boundary', file, 1, `Feature 禁止依赖 app 内部实现：${specifier}`)
      continue
    }

    const previewOnlyTarget = target ? isPreviewSource(targetRelative) : false

    if (uiDesignSource) {
      if (specifier.startsWith('@feature-preview/')) {
        if (!target || !isPublicPreviewEntry(target)) {
          report(
            'preview-boundary',
            file,
            1,
            `UIDesign 只能通过 Feature public.preview.ts 导入 Canonical 页面：${specifier}`,
          )
        }
        continue
      }
      if (specifier.startsWith('@features/') || (target && isFeatureTarget(target))) {
        report(
          'preview-boundary',
          file,
          1,
          `UIDesign 禁止深层导入生产 Feature；请使用 @feature-preview/.../public.preview：${specifier}`,
        )
        continue
      }
    }

    if (
      !uiDesignSource &&
      !previewSource &&
      (specifier.startsWith('@feature-preview/') || previewOnlyTarget)
    ) {
      report('preview-boundary', file, 1, `生产代码禁止导入 Preview-only 代码：${specifier}`)
      continue
    }

    if (
      publicPreviewEntry &&
      target &&
      isFeatureTarget(target) &&
      !isPreviewSource(targetRelative)
    ) {
      report(
        'preview-boundary',
        file,
        1,
        `public.preview.ts 只能导出同 Feature 的 preview/** 入口：${specifier}`,
      )
      continue
    }

    if (previewSource && isForbiddenPreviewDependency(targetRelative, specifier)) {
      report(
        'preview-boundary',
        file,
        1,
        `Feature Preview 禁止连接真实 API、Store 或生产路由：${specifier}`,
      )
      continue
    }

    if (!target || !importerFeature || isSubsystemRouteAggregator) continue

    const targetFeature = featureIdentity(targetRelative)
    const targetsPublicContract = /(?:^|\/)public(?:\.[^/]+)?$/u.test(targetRelative)

    if (targetFeature && targetFeature !== importerFeature && !targetsPublicContract) {
      report(
        'feature-boundary',
        file,
        1,
        `${importerFeature} 禁止深层导入 ${targetFeature}：${specifier}`,
      )
    }
  }

  if (
    previewSource &&
    /\b(?:(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|navigator\.sendBeacon\s*\()/u.test(
      content,
    )
  ) {
    report('preview-boundary', file, 1, 'Feature Preview 禁止直接发起网络请求')
  }

  if (
    relativePath.startsWith('src/features/') &&
    !previewSource &&
    !isFeatureApiSource &&
    /\b(?:(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|navigator\.sendBeacon\s*\()/u.test(
      content,
    )
  ) {
    report('api-layer', file, 1, 'Feature 网络请求必须封装在本 Feature 的 api/ 目录')
  }

  if (isFeatureApiSource && /["']https?:\/\//iu.test(content)) {
    report('api-host', file, 1, 'Feature API 禁止硬编码 Host；只能使用统一 HTTP Client 的 baseURL')
  }
}

function importedDefaultComponents(content) {
  return [
    ...content.matchAll(
      /import\s+([A-Z][A-Za-z0-9_$]*)(?:\s*,\s*\{[\s\S]*?\})?\s+from\s+["']([^"']+)["']/gu,
    ),
  ].map((match) => ({ name: match[1], specifier: match[2] }))
}

function rendersComponent(content, name) {
  return new RegExp(`<${name}(?:\\s|/?>)`, 'u').test(content)
}

function usesComponentImport(content, matchesSpecifier) {
  return importedDefaultComponents(content).some(
    ({ name, specifier }) => matchesSpecifier(specifier) && rendersComponent(content, name),
  )
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function collectStaticRootClasses(content, componentNames) {
  const classes = new Set()

  for (const componentName of componentNames) {
    const componentPattern = new RegExp(`<${componentName}\\b[\\s\\S]*?>`, 'gu')
    for (const componentMatch of content.matchAll(componentPattern)) {
      const classMatch = componentMatch[0].match(/\sclass\s*=\s*["']([^"']+)["']/u)
      if (!classMatch) continue
      classMatch[1]
        .split(/\s+/u)
        .filter(Boolean)
        .forEach((className) => classes.add(className))
    }
  }

  return classes
}

function checkAppPageRootOverflow(file, content, appPageComponentNames) {
  const rootClasses = collectStaticRootClasses(content, appPageComponentNames)

  for (const rootClass of rootClasses) {
    const selectorPattern = new RegExp(
      `\\.${escapeRegularExpression(rootClass)}(?![\\w-])[^{}]*\\{([^{}]*)\\}`,
      'gu',
    )
    for (const styleMatch of content.matchAll(selectorPattern)) {
      if (!/\boverflow(?:-y)?\s*:\s*(?:hidden|clip)\b/iu.test(styleMatch[1])) continue
      const line = content.slice(0, styleMatch.index).split(/\r?\n/u).length
      report(
        'page-scroll-boundary',
        file,
        line,
        `AppPage 页面根 .${rootClass} 不得使用 overflow: hidden/clip 或 overflow-y: hidden/clip；短视口滚动兜底必须保留给 AppPage`,
      )
    }
  }
}

function usesFeatureContentPatternDelegate(file, content) {
  const ownerPath = normalizePath(relative(projectRoot, file))
  const featureRoot = ownerPath.match(/^(src\/features\/[^/]+\/[^/]+)\//u)?.[1]
  if (!featureRoot) return false

  return importedDefaultComponents(content).some(({ name, specifier }) => {
    if (!rendersComponent(content, name) || !specifier.startsWith('.')) return false
    const resolved = resolve(dirname(file), specifier)
    const candidate = extname(resolved) ? resolved : `${resolved}.vue`
    if (!existsSync(candidate)) return false
    const candidatePath = normalizePath(relative(projectRoot, candidate))
    if (!candidatePath.startsWith(`${featureRoot}/components/`)) return false

    const candidateContent = readFileSync(candidate, 'utf8')
    return importedDefaultComponents(candidateContent).some(
      ({ name: templateName, specifier: templateSpecifier }) =>
        /^@shared\/components\/page-templates\/[A-Z][A-Za-z0-9]+PageTemplate(?:\.vue)?$/u.test(
          templateSpecifier,
        ) &&
        !standalonePageTemplates.has(templateName) &&
        rendersComponent(candidateContent, templateName),
    )
  })
}

function isPageCompositionSource(relativePath) {
  return (
    /^src\/features\/.+\/pages\/.+Page\.vue$/u.test(relativePath) ||
    /^src\/features\/.+\/components\/.+PageView\.vue$/u.test(relativePath) ||
    certifiedFullPageComponents.has(relativePath)
  )
}

function checkPageComposition(file, content) {
  const relativePath = normalizePath(relative(projectRoot, file))
  if (!isPageCompositionSource(relativePath)) return

  const isNotFoundPage = relativePath === 'src/features/not-found/pages/NotFoundPage.vue'
  const isCanonicalPageView = /^src\/features\/.+\/components\/.+PageView\.vue$/u.test(relativePath)

  const appPageComponents = importedDefaultComponents(content).filter(({ specifier }) =>
    /^@shared\/components\/AppPage(?:\.vue)?$/u.test(specifier),
  )
  const usesAppPage = appPageComponents.some(({ name }) => rendersComponent(content, name))
  const renderedPageTemplates = importedDefaultComponents(content).filter(
    ({ name, specifier }) =>
      /^@shared\/components\/page-templates\/[A-Z][A-Za-z0-9]+PageTemplate(?:\.vue)?$/u.test(
        specifier,
      ) && rendersComponent(content, name),
  )
  const usesPageTemplate = renderedPageTemplates.length > 0
  const usesDelegatedContentPageTemplate = usesFeatureContentPatternDelegate(file, content)
  const usesContentPageTemplate = usesPageTemplate || usesDelegatedContentPageTemplate
  const usesStandalonePageTemplate = renderedPageTemplates.some(({ name }) =>
    standalonePageTemplates.has(name),
  )
  const usesCertifiedFullPage = usesComponentImport(content, (specifier) =>
    /^@shared\/business-components\/(?:SubsystemWorkspace|FeatureScaffoldPage)(?:\.vue)?$/u.test(
      specifier,
    ),
  )
  const usesCanonicalPageView = usesComponentImport(content, (specifier) =>
    /(?:^|\/)components\/[A-Z][A-Za-z0-9]+PageView(?:\.vue)?$/u.test(specifier),
  )

  if (certifiedFullPageComponents.has(relativePath) && !usesAppPage) {
    report('page-container', file, 1, '登记的全页业务组件必须由 AppPage 提供内容区边界')
  }

  if (isNotFoundPage && !usesAppPage) {
    report('page-container', file, 1, '特殊状态页可以省略 PageTemplate，但仍必须使用 AppPage')
  }

  if (
    !isNotFoundPage &&
    isCanonicalPageView &&
    (!usesContentPageTemplate || (!usesStandalonePageTemplate && !usesAppPage))
  ) {
    report(
      'page-pattern',
      file,
      1,
      'Canonical Page View 必须组合 AppPage 与已登记内容型 PageTemplate（可经同 Feature 共享面板委托一层），或使用已登记 standalone PageTemplate',
    )
  } else if (
    !isNotFoundPage &&
    !certifiedFullPageComponents.has(relativePath) &&
    !(usesAppPage && usesContentPageTemplate) &&
    !usesStandalonePageTemplate &&
    !usesCertifiedFullPage &&
    !usesCanonicalPageView
  ) {
    report(
      'page-pattern',
      file,
      1,
      '标准页面必须组合 AppPage + PageTemplate，或委托给 Canonical Page View/已登记全页组件',
    )
  }

  content.split(/\r?\n/u).forEach((line, index) => {
    if (line.includes('standards-allow')) return

    if (/\b100(?:d|s|l)?v(?:w|h)\b/iu.test(line)) {
      report(
        'page-viewport',
        file,
        index + 1,
        '页面不得使用视口单位固定宽高；尺寸和滚动边界由 AppShell/AppPage/PageTemplate 管理',
      )
    }
    if (/(?<!max-)\b(?:width|min-width)\s*:\s*(?:1\d{3}|[2-9]\d{3,})px\b/iu.test(line)) {
      report('page-viewport', file, index + 1, '页面不得设置桌面视口级固定宽度')
    }
    if (/(?<!max-)\b(?:height|min-height)\s*:\s*(?:[7-9]\d{2}|[1-9]\d{3,})px\b/iu.test(line)) {
      report('page-viewport', file, index + 1, '页面不得设置桌面视口级固定高度')
    }
  })

  if (usesAppPage) {
    checkAppPageRootOverflow(
      file,
      content,
      appPageComponents.map(({ name }) => name),
    )
  }

  if (usesPageTemplate && !usesAppPage && !usesStandalonePageTemplate) {
    report('page-container', file, 1, 'PageTemplate 必须放在 AppPage 内容容器内')
  }

  if (usesStandalonePageTemplate && usesAppPage) {
    report('page-container', file, 1, 'standalone PageTemplate 不得放入登录后的 AppPage 内容容器')
  }
}

for (const sourceRoot of sourceRoots) {
  const directory = resolve(projectRoot, sourceRoot)
  for (const file of walk(directory).filter((path) => sourceExtensions.has(extname(path)))) {
    const content = readFileSync(file, 'utf8')
    checkStyles(file, content)
    checkIamVersionTokens(file, content)
    checkRouteImplementationStatus(file, content)
    checkReferenceRouteRegistration(file, content)
    collectIconReferences(file, content)
    checkImports(file, content)
    checkPageComposition(file, content)
  }
}

const iconRegistryPath = resolve(projectRoot, iconRegistryFile)
const registeredIcons = existsSync(iconRegistryPath)
  ? new Set(
      [
        ...readFileSync(iconRegistryPath, 'utf8').matchAll(
          /^\s*(?:'([a-z0-9-]+)'|([a-z][a-z0-9-]*))\s*:/gmu,
        ),
      ].map((match) => match[1] ?? match[2]),
    )
  : new Set()

for (const reference of iconReferences) {
  if (!registeredIcons.has(reference.name)) {
    report(
      'local-icon',
      reference.file,
      reference.line,
      `图标 mdi:${reference.name} 必须在 ${iconRegistryFile} 本地注册，禁止依赖运行时网络加载`,
    )
  }
}

if (violations.length) {
  console.error('前端标准静态检查失败：')
  violations.forEach((violation) => console.error(`- ${violation}`))
  process.exitCode = 1
} else {
  console.log(
    '前端标准静态检查通过：Design Token、IAM VersionToken、本地图标、Feature/Preview/API 边界、AppPage/Page Pattern 与内容区尺寸均符合约束。',
  )
}
