import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'
import { parseDocument } from 'yaml'

const SUPPORTED_PROFILES = new Set(['base', 'preview', 'production'])
const SUPPORTED_SCOPES = new Set(['preview-visual', 'preview-interaction'])
const EXPECTED_VIEWPORTS = [
  { id: 'desktop-1366', width: 1366, height: 768 },
  { id: 'desktop-1440', width: 1440, height: 900 },
  { id: 'desktop-1920', width: 1920, height: 1080 },
]

function makeFinding(code, file, path, message, severity = 'error') {
  return { code, file, path, message, severity }
}

function addFinding(findings, code, file, path, message, severity = 'error') {
  findings.push(makeFinding(code, file, path, message, severity))
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readStructuredFile(path) {
  const source = readFileSync(path, 'utf8')
  const document = parseDocument(source, { schema: 'core', uniqueKeys: true })
  const diagnostics = [...document.errors, ...document.warnings]

  if (diagnostics.length) {
    throw new Error(diagnostics.map((item) => item.message).join('；'))
  }

  return {
    data: document.toJS({ maxAliasCount: 0 }),
    rawSha256: createHash('sha256').update(source).digest('hex'),
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function canonicalContractSha256(contract) {
  return createHash('sha256').update(canonicalJson(contract)).digest('hex')
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function isSafeProjectPath(projectRoot, projectPath) {
  if (
    typeof projectPath !== 'string' ||
    !projectPath ||
    projectPath.includes('\\') ||
    isAbsolute(projectPath) ||
    /^[A-Za-z]:/u.test(projectPath)
  ) {
    return false
  }

  const absolutePath = resolve(projectRoot, projectPath)
  const relativePath = relative(projectRoot, absolutePath)
  return relativePath !== '' && !relativePath.startsWith('..') && !isAbsolute(relativePath)
}

function statIsFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function statIsDirectory(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function projectFileExists(projectRoot, projectPath) {
  return isSafeProjectPath(projectRoot, projectPath) && statIsFile(resolve(projectRoot, projectPath))
}

function duplicateValues(values) {
  const seen = new Set()
  const duplicates = new Set()

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }

  return [...duplicates]
}

function validateUniqueIds(findings, file, label, items) {
  for (const duplicate of duplicateValues(items.map((item) => item.id))) {
    addFinding(findings, 'contract.duplicate-id', file, label, `${label} 存在重复 id：${duplicate}`)
  }
}

function validateProjectReference(findings, projectRoot, file, path, projectPath, mustExist = true) {
  if (!isSafeProjectPath(projectRoot, projectPath)) {
    addFinding(
      findings,
      'contract.unsafe-path',
      file,
      path,
      `必须使用不含盘符、反斜杠或 .. 的仓库相对路径：${projectPath}`,
    )
    return false
  }

  if (mustExist && !projectFileExists(projectRoot, projectPath)) {
    addFinding(findings, 'contract.missing-file', file, path, `引用文件不存在：${projectPath}`)
    return false
  }

  return true
}

function validateRegistry(projectRoot, registry, findings) {
  const file = 'standards/registry.json'
  const schema = readJson(resolve(projectRoot, 'standards/schemas/registry.v1.schema.json'))
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validate = ajv.compile(schema)

  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      addFinding(
        findings,
        'registry.schema',
        file,
        error.instancePath || '/',
        error.message ?? 'Registry 不符合 Schema',
      )
    }
    return false
  }

  const viewportSignature = JSON.stringify(
    registry.viewports.map(({ id, width, height }) => ({ id, width, height })),
  )
  if (viewportSignature !== JSON.stringify(EXPECTED_VIEWPORTS)) {
    addFinding(
      findings,
      'registry.viewports',
      file,
      '/viewports',
      'Viewport 必须精确且按顺序声明 1366×768、1440×900、1920×1080',
    )
  }

  if (registry.approvalStore) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      '/approvalStore/schema',
      registry.approvalStore.schema,
    )
    const approvalDirectory = registry.approvalStore.directory
    if (!isSafeProjectPath(projectRoot, approvalDirectory)) {
      addFinding(
        findings,
        'registry.approval-directory',
        file,
        '/approvalStore/directory',
        `Approval Store 必须使用安全的仓库相对路径：${approvalDirectory}`,
      )
    } else if (!statIsDirectory(resolve(projectRoot, approvalDirectory))) {
      addFinding(
        findings,
        'registry.approval-directory',
        file,
        '/approvalStore/directory',
        `Approval Store 目录不存在：${approvalDirectory}`,
      )
    }
  }

  const packageJson = readJson(resolve(projectRoot, 'package.json'))
  const scripts = packageJson.scripts ?? {}
  for (const [key, scriptName] of Object.entries(registry.verificationEntries)) {
    if (typeof scripts[scriptName] !== 'string') {
      addFinding(
        findings,
        'registry.verification-entry',
        file,
        `/verificationEntries/${key}`,
        `package.json 中不存在脚本 ${scriptName}`,
      )
    }
  }

  const implementations = [
    ...Object.entries(registry.layouts),
    ...Object.entries(registry.patterns),
    ...Object.entries(registry.components),
  ]
  for (const [key, item] of implementations) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/implementations/${key}`,
      item.canonicalImplementation,
    )
    if (!registry.verificationEntries[item.verificationEntry]) {
      addFinding(
        findings,
        'registry.verification-owner',
        file,
        `/implementations/${key}/verificationEntry`,
        `未登记 verificationEntry：${item.verificationEntry}`,
      )
    }
  }

  for (const [label, projectPath] of [
    ['pageContract.schema', registry.pageContract.schema],
    ['designTokens.runtimeSource', registry.designTokens.runtimeSource],
    ['designTokens.designContext', registry.designTokens.designContext],
  ]) {
    validateProjectReference(findings, projectRoot, file, `/${label}`, projectPath)
  }

  return true
}

function validateContractSources(projectRoot, contract, file, findings) {
  const sourceGroups = ['prd', 'api', 'permissions', 'ux', 'references']
  const sources = sourceGroups.flatMap((group) => contract.sources[group])
  validateUniqueIds(findings, file, 'sources', sources)

  for (const [groupIndex, group] of sourceGroups.entries()) {
    for (const [sourceIndex, source] of contract.sources[group].entries()) {
      validateProjectReference(
        findings,
        projectRoot,
        file,
        `/sources/${groupIndex}/${sourceIndex}/ref`,
        source.ref,
      )
    }
  }

  const userReferences = contract.sources.references.filter((source) => source.origin === 'user')
  if (contract.sources.inputMode === 'prd-only' && userReferences.length) {
    addFinding(
      findings,
      'contract.input-mode',
      file,
      '/sources/inputMode',
      'prd-only 不得包含 origin=user 的视觉参考；项目内相邻页面证据仍可保留',
    )
  }
  if (contract.sources.inputMode === 'prd-with-reference' && !userReferences.length) {
    addFinding(
      findings,
      'contract.input-mode',
      file,
      '/sources/references',
      'prd-with-reference 至少需要一个 origin=user 的参考证据',
    )
  }

  return {
    sourceIds: new Set(sources.map((source) => source.id)),
    permissionIds: new Set(contract.sources.permissions.map((source) => source.id)),
  }
}

function validateImplementation(projectRoot, contract, file, findings) {
  const featureRoot = `src/features/${contract.page.feature}/`
  const [subsystem] = contract.page.feature.split('/')
  const implementation = contract.implementation
  const appLayoutOwnsProductionShell =
    implementation.productionBinding === 'src/app/layouts/AppLayout.vue' &&
    contract.exceptions.some((exception) => exception.id === 'app-layout-production-owner') &&
    contract.composition.components.some(
      (component) => component.componentKey === 'shared.app-shell',
    )

  for (const [key, projectPath] of Object.entries(implementation)) {
    if (key === 'productionRoute') continue
    validateProjectReference(findings, projectRoot, file, `/implementation/${key}`, projectPath, false)
  }

  if (!implementation.canonicalEntry.startsWith(featureRoot)) {
    addFinding(
      findings,
      'contract.feature-owner',
      file,
      '/implementation/canonicalEntry',
      `Canonical Entry 必须归属 ${featureRoot}`,
    )
  }
  if (/\/(?:api|preview|pages|stores?)\//u.test(implementation.canonicalEntry)) {
    addFinding(
      findings,
      'contract.canonical-entry',
      file,
      '/implementation/canonicalEntry',
      'Canonical Entry 不得位于 API、Preview、Production Page 或 Store 装配目录',
    )
  }
  if (implementation.previewEntry !== `${featureRoot}public.preview.ts`) {
    addFinding(
      findings,
      'contract.preview-entry',
      file,
      '/implementation/previewEntry',
      `Preview Entry 必须是 ${featureRoot}public.preview.ts`,
    )
  }
  if (!implementation.previewBinding.startsWith(`${featureRoot}preview/`)) {
    addFinding(
      findings,
      'contract.preview-binding',
      file,
      '/implementation/previewBinding',
      `Preview Binding 必须位于 ${featureRoot}preview/`,
    )
  }
  if (
    implementation.productionBinding &&
    !implementation.productionBinding.startsWith(`${featureRoot}pages/`) &&
    !appLayoutOwnsProductionShell
  ) {
    addFinding(
      findings,
      'contract.production-binding',
      file,
      '/implementation/productionBinding',
      `Production Binding 必须位于 ${featureRoot}pages/`,
    )
  }
  if (
    implementation.routeSource &&
    implementation.routeSource !== `src/features/${subsystem}/routes.ts`
  ) {
    addFinding(
      findings,
      'contract.route-source',
      file,
      '/implementation/routeSource',
      `子系统路由聚合文件必须是 src/features/${subsystem}/routes.ts`,
    )
  }
}

function validateComposition(registry, contract, file, findings) {
  const pattern = registry.patterns[contract.page.patternKey]
  if (!pattern) {
    addFinding(
      findings,
      'contract.pattern-key',
      file,
      '/page/patternKey',
      `Registry 中不存在 Page Pattern：${contract.page.patternKey}`,
    )
  } else if (!pattern.pageTypes.includes(contract.page.type)) {
    addFinding(
      findings,
      'contract.pattern-type',
      file,
      '/page/type',
      `${contract.page.patternKey} 不支持页面类型 ${contract.page.type}`,
    )
  }
  if (!registry.layouts[contract.composition.layoutKey]) {
    addFinding(
      findings,
      'contract.layout-key',
      file,
      '/composition/layoutKey',
      `Registry 中不存在 Layout：${contract.composition.layoutKey}`,
    )
  }

  const regions = contract.composition.regions
  validateUniqueIds(findings, file, 'composition.regions', regions)
  for (const duplicate of duplicateValues(regions.map((region) => region.order))) {
    addFinding(
      findings,
      'contract.duplicate-order',
      file,
      '/composition/regions',
      `Region order 重复：${duplicate}`,
    )
  }

  const regionIds = new Set(regions.map((region) => region.id))
  for (const region of regions) {
    if (region.parentId && (!regionIds.has(region.parentId) || region.parentId === region.id)) {
      addFinding(
        findings,
        'contract.region-parent',
        file,
        `/composition/regions/${region.id}/parentId`,
        `Region parentId 无法解析或指向自身：${region.parentId}`,
      )
    }
  }

  const components = contract.composition.components
  validateUniqueIds(findings, file, 'composition.components', components)
  const componentIds = new Set(components.map((component) => component.id))
  const featureComponentPrefix = `feature.${contract.page.feature.replace('/', '.')}.`

  for (const component of components) {
    if (!regionIds.has(component.regionId)) {
      addFinding(
        findings,
        'contract.component-region',
        file,
        `/composition/components/${component.id}/regionId`,
        `Component 引用了不存在的 Region：${component.regionId}`,
      )
    }
    if (component.componentKey.startsWith('feature.')) {
      if (!component.componentKey.startsWith(featureComponentPrefix)) {
        addFinding(
          findings,
          'contract.feature-component',
          file,
          `/composition/components/${component.id}/componentKey`,
          `Feature componentKey 必须以 ${featureComponentPrefix} 开头`,
        )
      }
    } else if (!registry.components[component.componentKey]) {
      addFinding(
        findings,
        'contract.component-key',
        file,
        `/composition/components/${component.id}/componentKey`,
        `Registry 中不存在 Canonical Component：${component.componentKey}`,
      )
    }
  }

  return { componentIds, regionIds }
}

function validateBehaviorReferences(projectRoot, contract, file, findings, identifiers) {
  const { componentIds, permissionIds, regionIds, sourceIds } = identifiers
  const scopeIds = new Set(['page', ...regionIds, ...componentIds])

  validateUniqueIds(findings, file, 'states', contract.states)
  const stateIds = new Set(contract.states.map((state) => state.id))
  if (contract.states.filter((state) => state.isDefault).length !== 1) {
    addFinding(
      findings,
      'contract.default-state',
      file,
      '/states',
      'states 必须且只能声明一个 isDefault=true',
    )
  }
  for (const state of contract.states) {
    if (!scopeIds.has(state.scopeRef)) {
      addFinding(
        findings,
        'contract.state-scope',
        file,
        `/states/${state.id}/scopeRef`,
        `State scopeRef 无法解析：${state.scopeRef}`,
      )
    }
    if (state.ruleRef && !sourceIds.has(state.ruleRef)) {
      addFinding(
        findings,
        'contract.source-ref',
        file,
        `/states/${state.id}/ruleRef`,
        `State ruleRef 无法解析：${state.ruleRef}`,
      )
    }
  }

  validateUniqueIds(findings, file, 'interactions', contract.interactions)
  const interactionIds = new Set(contract.interactions.map((interaction) => interaction.id))
  for (const interaction of contract.interactions) {
    if (!scopeIds.has(interaction.targetRef)) {
      addFinding(
        findings,
        'contract.interaction-target',
        file,
        `/interactions/${interaction.id}/targetRef`,
        `Interaction targetRef 无法解析：${interaction.targetRef}`,
      )
    }
    if (!sourceIds.has(interaction.ruleRef)) {
      addFinding(
        findings,
        'contract.source-ref',
        file,
        `/interactions/${interaction.id}/ruleRef`,
        `Interaction ruleRef 无法解析：${interaction.ruleRef}`,
      )
    }
  }

  validateUniqueIds(findings, file, 'acceptance', contract.acceptance)
  const acceptanceIds = new Set(contract.acceptance.map((item) => item.id))
  for (const acceptance of contract.acceptance) {
    if (!sourceIds.has(acceptance.sourceRef)) {
      addFinding(
        findings,
        'contract.source-ref',
        file,
        `/acceptance/${acceptance.id}/sourceRef`,
        `Acceptance sourceRef 无法解析：${acceptance.sourceRef}`,
      )
    }
    if (acceptance.stateRef && !stateIds.has(acceptance.stateRef)) {
      addFinding(
        findings,
        'contract.state-ref',
        file,
        `/acceptance/${acceptance.id}/stateRef`,
        `Acceptance stateRef 无法解析：${acceptance.stateRef}`,
      )
    }
    if (acceptance.interactionRef && !interactionIds.has(acceptance.interactionRef)) {
      addFinding(
        findings,
        'contract.interaction-ref',
        file,
        `/acceptance/${acceptance.id}/interactionRef`,
        `Acceptance interactionRef 无法解析：${acceptance.interactionRef}`,
      )
    }
    if (acceptance.testRef) {
      validateProjectReference(
        findings,
        projectRoot,
        file,
        `/acceptance/${acceptance.id}/testRef`,
        acceptance.testRef,
        false,
      )
    }
  }

  validateUniqueIds(findings, file, 'mockScenarios', contract.mockScenarios)
  if (
    contract.mockScenarios.length > 0 &&
    contract.mockScenarios.filter((scenario) => scenario.isDefault).length !== 1
  ) {
    addFinding(
      findings,
      'contract.default-scenario',
      file,
      '/mockScenarios',
      '存在 Mock Scenario 时必须且只能声明一个 isDefault=true',
    )
  }
  for (const scenario of contract.mockScenarios) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/mockScenarios/${scenario.id}/fixtureRef`,
      scenario.fixtureRef,
      false,
    )
    if (scenario.permissionFixtureRef) {
      validateProjectReference(
        findings,
        projectRoot,
        file,
        `/mockScenarios/${scenario.id}/permissionFixtureRef`,
        scenario.permissionFixtureRef,
        false,
      )
      if (!scenario.permissionRef) {
        addFinding(
          findings,
          'contract.permission-fixture-pairing',
          file,
          `/mockScenarios/${scenario.id}/permissionFixtureRef`,
          'permissionFixtureRef 必须同时声明可追踪到权限权威来源的 permissionRef',
        )
      }
    }
    if (!stateIds.has(scenario.stateRef)) {
      addFinding(
        findings,
        'contract.state-ref',
        file,
        `/mockScenarios/${scenario.id}/stateRef`,
        `Mock Scenario stateRef 无法解析：${scenario.stateRef}`,
      )
    }
    if (scenario.permissionRef && !permissionIds.has(scenario.permissionRef)) {
      addFinding(
        findings,
        'contract.permission-ref',
        file,
        `/mockScenarios/${scenario.id}/permissionRef`,
        `Mock Scenario permissionRef 无法解析：${scenario.permissionRef}`,
      )
    }
    for (const acceptanceRef of scenario.acceptanceRefs ?? []) {
      if (!acceptanceIds.has(acceptanceRef)) {
        addFinding(
          findings,
          'contract.acceptance-ref',
          file,
          `/mockScenarios/${scenario.id}/acceptanceRefs`,
          `Mock Scenario acceptanceRef 无法解析：${acceptanceRef}`,
        )
      }
    }
  }

  validateUniqueIds(findings, file, 'exceptions', contract.exceptions)
  for (const exception of contract.exceptions) {
    if (!scopeIds.has(exception.scopeRef)) {
      addFinding(
        findings,
        'contract.exception-scope',
        file,
        `/exceptions/${exception.id}/scopeRef`,
        `Exception scopeRef 无法解析：${exception.scopeRef}`,
      )
    }
  }

  const allIssues = [
    ...contract.issues.blockers,
    ...contract.issues.deferred,
    ...contract.issues.outOfScope,
  ]
  validateUniqueIds(findings, file, 'issues', allIssues)

  for (const [index, browserTest] of contract.verification.browserTests.entries()) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/verification/browserTests/${index}`,
      browserTest,
      false,
    )
  }
}

function validateContract(projectRoot, registry, contract, file, findings) {
  const sources = validateContractSources(projectRoot, contract, file, findings)
  validateImplementation(projectRoot, contract, file, findings)
  const composition = validateComposition(registry, contract, file, findings)
  validateBehaviorReferences(projectRoot, contract, file, findings, { ...sources, ...composition })
}

function validatePreviewProfile(projectRoot, registry, contract, file, findings, scope) {
  const implementationFields = ['canonicalEntry', 'previewEntry', 'previewBinding']
  for (const field of implementationFields) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/implementation/${field}`,
      contract.implementation[field],
    )
  }

  if (!contract.mockScenarios.length) {
    addFinding(
      findings,
      'preview.scenario-missing',
      file,
      '/mockScenarios',
      'Preview Profile 至少需要一个 Mock Scenario',
    )
  }
  for (const scenario of contract.mockScenarios) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/mockScenarios/${scenario.id}/fixtureRef`,
      scenario.fixtureRef,
    )
    if (scenario.permissionFixtureRef) {
      validateProjectReference(
        findings,
        projectRoot,
        file,
        `/mockScenarios/${scenario.id}/permissionFixtureRef`,
        scenario.permissionFixtureRef,
      )
    }
  }

  if (!contract.verification.browserTests.length) {
    addFinding(
      findings,
      'preview.browser-test-missing',
      file,
      '/verification/browserTests',
      'Preview Profile 至少需要一个 Browser Test',
    )
  }
  for (const [index, browserTest] of contract.verification.browserTests.entries()) {
    validateProjectReference(
      findings,
      projectRoot,
      file,
      `/verification/browserTests/${index}`,
      browserTest,
    )
  }

  const actualViewports = contract.verification.viewports
  const expectedViewports = registry.viewports.map((viewport) => viewport.id)
  if (JSON.stringify(actualViewports) !== JSON.stringify(expectedViewports)) {
    addFinding(
      findings,
      'preview.viewports',
      file,
      '/verification/viewports',
      `Preview Viewport 必须精确且按顺序为 ${expectedViewports.join(', ')}`,
    )
  }

  const requestedScopes = scope
    ? [scope]
    : ['preview-visual', 'preview-interaction']
  if (requestedScopes.includes('preview-interaction') && !contract.interactions.length) {
    addFinding(
      findings,
      'preview.interaction-missing',
      file,
      '/interactions',
      'preview-interaction Profile 至少需要一个可观察 Interaction',
    )
  }

  for (const issue of contract.issues.blockers) {
    const affected = issue.affectedScopes.some((item) => requestedScopes.includes(item))
    if (affected) {
      addFinding(
        findings,
        'preview.blocked',
        file,
        `/issues/blockers/${issue.id}`,
        `候选预览仍有阻断项：${issue.description}`,
        'blocked',
      )
    }
  }
}

function validateApprovalRecord(projectRoot, registry, contract, contractFile, findings) {
  const approvalStore = registry.approvalStore
  if (!approvalStore) {
    addFinding(
      findings,
      'production.approval-store-not-configured',
      contractFile,
      '/approval',
      'Approval Store 尚未配置，不能证明当前 Contract 已由人工批准',
      'blocked',
    )
    return
  }

  const recordFile = `${approvalStore.directory}/${contract.page.id}.json`
  if (!projectFileExists(projectRoot, recordFile)) {
    addFinding(
      findings,
      'production.approval-record-missing',
      contractFile,
      '/approval',
      `缺少人工 Approval Record：${recordFile}`,
      'blocked',
    )
    return
  }

  let record
  try {
    record = readJson(resolve(projectRoot, recordFile))
  } catch (error) {
    addFinding(
      findings,
      'production.approval-record-read',
      recordFile,
      '/',
      `无法读取 Approval Record：${error instanceof Error ? error.message : String(error)}`,
    )
    return
  }

  const approvalSchema = readJson(resolve(projectRoot, approvalStore.schema))
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validateApproval = ajv.compile(approvalSchema)
  if (!validateApproval(record)) {
    for (const error of validateApproval.errors ?? []) {
      addFinding(
        findings,
        'production.approval-record-schema',
        recordFile,
        error.instancePath || '/',
        error.message ?? 'Approval Record 不符合 Schema',
      )
    }
    return
  }

  const expectedDigest = canonicalContractSha256(contract)
  const expectedViewportIds = registry.viewports.map((viewport) => viewport.id)
  const actualViewportIds = record.viewports
  const baselineViewportIds = record.baselines.map((baseline) => baseline.viewportId)
  const exceptionIds = new Set(contract.exceptions.map((exception) => exception.id))

  if (record.pageId !== contract.page.id) {
    addFinding(
      findings,
      'production.approval-page',
      recordFile,
      '/pageId',
      `Approval Record pageId 与 Contract 不一致：${record.pageId}`,
    )
  }
  if (record.contract.path !== contractFile) {
    addFinding(
      findings,
      'production.approval-contract-path',
      recordFile,
      '/contract/path',
      `Approval Record 必须绑定 ${contractFile}`,
    )
  }
  if (record.contract.revision !== contract.page.revision) {
    addFinding(
      findings,
      'production.approval-revision',
      recordFile,
      '/contract/revision',
      `Approval revision ${record.contract.revision} 与当前 revision ${contract.page.revision} 不一致`,
      'blocked',
    )
  }
  if (
    record.contract.digestAlgorithm !== approvalStore.digestAlgorithm ||
    record.contract.digest !== expectedDigest
  ) {
    addFinding(
      findings,
      'production.approval-digest',
      recordFile,
      '/contract/digest',
      'Approval Record 与当前 Page Contract 摘要不一致，需要重新人工评审',
      'blocked',
    )
  }
  if (record.scope.id !== registry.previewHost.approvalScope) {
    addFinding(
      findings,
      'production.approval-scope',
      recordFile,
      '/scope/id',
      `Approval scope 必须是 ${registry.previewHost.approvalScope}`,
      'blocked',
    )
  }
  for (const exceptionRef of record.scope.exceptionRefs) {
    if (!exceptionIds.has(exceptionRef)) {
      addFinding(
        findings,
        'production.approval-exception-ref',
        recordFile,
        '/scope/exceptionRefs',
        `Approval exceptionRef 无法解析：${exceptionRef}`,
      )
    }
  }
  if (JSON.stringify(actualViewportIds) !== JSON.stringify(expectedViewportIds)) {
    addFinding(
      findings,
      'production.approval-viewports',
      recordFile,
      '/viewports',
      `Approval Viewport 必须精确且按顺序为 ${expectedViewportIds.join(', ')}`,
    )
  }
  if (JSON.stringify(baselineViewportIds) !== JSON.stringify(expectedViewportIds)) {
    addFinding(
      findings,
      'production.approval-baselines',
      recordFile,
      '/baselines',
      `Approval Baseline 必须逐项覆盖 ${expectedViewportIds.join(', ')}`,
    )
  }

  for (const [index, baseline] of record.baselines.entries()) {
    const baselinePath = baseline.path
    if (
      !validateProjectReference(
        findings,
        projectRoot,
        recordFile,
        `/baselines/${index}/path`,
        baselinePath,
      )
    ) {
      continue
    }
    if (fileSha256(resolve(projectRoot, baselinePath)) !== baseline.sha256) {
      addFinding(
        findings,
        'production.approval-baseline-digest',
        recordFile,
        `/baselines/${index}/sha256`,
        `已批准视觉基线摘要不匹配：${baselinePath}`,
        'blocked',
      )
    }
  }
}

function validateProductionProfile(projectRoot, registry, contract, file, findings) {
  validatePreviewProfile(projectRoot, registry, contract, file, findings)

  const productionScopes = new Set(['production-binding', 'production-regression'])
  for (const issue of contract.issues.blockers) {
    const affected = issue.affectedScopes.some((item) => productionScopes.has(item))
    if (affected) {
      addFinding(
        findings,
        'production.blocked',
        file,
        `/issues/blockers/${issue.id}`,
        `生产候选仍有阻断项：${issue.description}`,
        'blocked',
      )
    }
  }

  for (const field of ['productionBinding', 'routeSource']) {
    const value = contract.implementation[field]
    if (!value) {
      addFinding(
        findings,
        'production.binding-missing',
        file,
        `/implementation/${field}`,
        `Production Profile 缺少 ${field}`,
      )
    } else {
      validateProjectReference(findings, projectRoot, file, `/implementation/${field}`, value)
    }
  }
  if (!contract.implementation.productionRoute) {
    addFinding(
      findings,
      'production.route-missing',
      file,
      '/implementation/productionRoute',
      'Production Profile 缺少 productionRoute',
    )
  }
  if (!contract.sources.api.length) {
    addFinding(
      findings,
      'production.api-source-missing',
      file,
      '/sources/api',
      'Production Profile 必须绑定 API 权威来源',
      'blocked',
    )
  }
  if (!contract.sources.permissions.length) {
    addFinding(
      findings,
      'production.permission-source-missing',
      file,
      '/sources/permissions',
      'Production Profile 必须绑定权限权威来源',
      'blocked',
    )
  }

  const routeSource = contract.implementation.routeSource
  const productionPage = contract.implementation.productionBinding
  const productionRoute = contract.implementation.productionRoute
  const appLayoutOwnsProductionShell =
    productionPage === 'src/app/layouts/AppLayout.vue' &&
    contract.exceptions.some((exception) => exception.id === 'app-layout-production-owner') &&
    contract.composition.components.some(
      (component) => component.componentKey === 'shared.app-shell',
    )
  if (routeSource && productionPage && productionRoute && projectFileExists(projectRoot, routeSource)) {
    const routeCode = readFileSync(resolve(projectRoot, routeSource), 'utf8')
    const relativeRoute = productionRoute.replace(/^\//u, '')
    if (!routeCode.includes(`path: '${relativeRoute}'`) && !routeCode.includes(`path: "${relativeRoute}"`)) {
      addFinding(
        findings,
        'production.route-registration',
        file,
        '/implementation/productionRoute',
        `路由源未登记 ${productionRoute}`,
      )
    }
    if (!appLayoutOwnsProductionShell && !routeCode.includes(basename(productionPage))) {
      addFinding(
        findings,
        'production.page-registration',
        file,
        '/implementation/productionBinding',
        `路由源未装载 ${basename(productionPage)}`,
      )
    }
  }

  validateApprovalRecord(projectRoot, registry, contract, file, findings)
}

function contractFiles(projectRoot) {
  const directory = resolve(projectRoot, 'docs/page-specs')
  return readdirSync(directory)
    .filter((file) => /\.(?:json|ya?ml)$/u.test(file))
    .sort()
    .map((file) => `docs/page-specs/${file}`)
}

function compileContractSchema(projectRoot, registry) {
  const schema = readJson(resolve(projectRoot, registry.pageContract.schema))
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  return ajv.compile(schema)
}

export function validatePageContracts({
  projectRoot = process.cwd(),
  profile = 'base',
  pageId,
  scope,
} = {}) {
  const root = resolve(projectRoot)
  const findings = []
  const hashes = {}

  if (!SUPPORTED_PROFILES.has(profile)) {
    addFinding(
      findings,
      'cli.profile',
      '<command>',
      '--profile',
      `未知 Profile：${profile}`,
    )
  }
  if (scope && !SUPPORTED_SCOPES.has(scope)) {
    addFinding(findings, 'cli.scope', '<command>', '--scope', `未知 Scope：${scope}`)
  }
  if (profile === 'base' && scope) {
    addFinding(findings, 'cli.scope', '<command>', '--scope', 'base Profile 不接受 --scope')
  }
  if (profile !== 'base' && !pageId) {
    addFinding(
      findings,
      'cli.page-required',
      '<command>',
      '--page',
      `${profile} Profile 必须指定 --page <page-id>`,
    )
  }

  const registryPath = resolve(root, 'standards/registry.json')
  let registry
  try {
    registry = readJson(registryPath)
  } catch (error) {
    addFinding(
      findings,
      'registry.read',
      'standards/registry.json',
      '/',
      `无法读取 Registry：${error instanceof Error ? error.message : String(error)}`,
    )
    return buildResult(profile, pageId, findings, hashes, 0, 0)
  }

  const registryValid = validateRegistry(root, registry, findings)
  if (!registryValid) return buildResult(profile, pageId, findings, hashes, 0, 0)

  const legacySpecs = new Set(registry.pageContract.legacySpecs)
  const files = contractFiles(root)
  const fileSet = new Set(files)
  for (const legacySpec of legacySpecs) {
    if (!fileSet.has(legacySpec)) {
      addFinding(
        findings,
        'legacy.missing',
        'standards/registry.json',
        '/pageContract/legacySpecs',
        `Legacy Page Specification 不存在：${legacySpec}`,
      )
    }
  }

  const validateSchema = compileContractSchema(root, registry)
  const contracts = []
  let legacyCount = 0

  for (const file of files) {
    let parsed
    try {
      parsed = readStructuredFile(resolve(root, file))
    } catch (error) {
      addFinding(
        findings,
        'contract.parse',
        file,
        '/',
        `无法安全解析：${error instanceof Error ? error.message : String(error)}`,
      )
      continue
    }

    hashes[file] = parsed.rawSha256
    const contract = parsed.data
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
      addFinding(findings, 'contract.root', file, '/', '页面规格必须是对象')
      continue
    }

    if (!contract.schemaVersion) {
      if (!legacySpecs.has(file)) {
        addFinding(
          findings,
          'legacy.not-allowlisted',
          file,
          '/schemaVersion',
          '新页面规格必须显式声明 schemaVersion: "0.1"',
        )
      } else {
        legacyCount += 1
      }
      continue
    }

    if (legacySpecs.has(file)) {
      addFinding(
        findings,
        'legacy.version-conflict',
        file,
        '/schemaVersion',
        '已声明版本的 Page Contract 不得继续保留在 Legacy 白名单',
      )
    }
    if (contract.schemaVersion !== registry.pageContract.currentVersion) {
      addFinding(
        findings,
        'contract.unsupported-version',
        file,
        '/schemaVersion',
        `不支持 Page Contract 版本：${contract.schemaVersion}`,
      )
      continue
    }

    if (!validateSchema(contract)) {
      for (const error of validateSchema.errors ?? []) {
        addFinding(
          findings,
          'contract.schema',
          file,
          error.instancePath || '/',
          error.message ?? 'Page Contract 不符合 Schema',
        )
      }
      continue
    }

    validateContract(root, registry, contract, file, findings)
    contracts.push({ contract, file })
  }

  for (const duplicate of duplicateValues(contracts.map(({ contract }) => contract.page.id))) {
    addFinding(
      findings,
      'contract.duplicate-page',
      'docs/page-specs',
      '/page/id',
      `Page Contract page.id 重复：${duplicate}`,
    )
  }

  if (pageId) {
    const matches = contracts.filter(({ contract }) => contract.page.id === pageId)
    if (matches.length !== 1) {
      addFinding(
        findings,
        'contract.page-resolution',
        'docs/page-specs',
        '/page/id',
        `--page ${pageId} 必须唯一解析到一份 v0.1 Page Contract`,
      )
    } else if (!findings.some((finding) => finding.file === matches[0].file && finding.severity === 'error')) {
      const { contract, file } = matches[0]
      if (profile === 'preview') {
        validatePreviewProfile(root, registry, contract, file, findings, scope)
      } else if (profile === 'production') {
        validateProductionProfile(root, registry, contract, file, findings)
      }
    }
  }

  return buildResult(profile, pageId, findings, hashes, legacyCount, contracts.length)
}

function buildResult(profile, pageId, findings, rawSha256, legacyCount, contractCount) {
  const orderedFindings = [...findings].sort((left, right) =>
    `${left.file}:${left.path}:${left.code}`.localeCompare(`${right.file}:${right.path}:${right.code}`),
  )
  const hasErrors = orderedFindings.some((finding) => finding.severity === 'error')
  const hasBlockers = orderedFindings.some((finding) => finding.severity === 'blocked')
  const status = hasErrors ? 'failed' : hasBlockers ? 'blocked' : 'passed'

  return {
    schemaVersion: 1,
    status,
    profile,
    pageId: pageId ?? null,
    summary: {
      legacySpecs: legacyCount,
      pageContracts: contractCount,
      errors: orderedFindings.filter((finding) => finding.severity === 'error').length,
      blockers: orderedFindings.filter((finding) => finding.severity === 'blocked').length,
    },
    rawSha256,
    findings: orderedFindings,
  }
}

function parseArguments(argv) {
  const options = { profile: 'base', format: 'text' }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--profile' || argument === '--page' || argument === '--scope' || argument === '--format') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${argument} 缺少参数值`)
      const key = argument.slice(2)
      options[key] = value
      index += 1
    } else {
      throw new Error(`未知参数：${argument}`)
    }
  }

  if (!['text', 'json'].includes(options.format)) {
    throw new Error(`--format 仅支持 text 或 json：${options.format}`)
  }
  return options
}

function printResult(result, format) {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const label = result.status === 'passed' ? '通过' : result.status === 'blocked' ? '阻断' : '失败'
  console.log(
    `Page Contract ${result.profile} 检查${label}：Legacy ${result.summary.legacySpecs}，v0.1 ${result.summary.pageContracts}。`,
  )
  for (const finding of result.findings) {
    console.error(
      `- ${finding.file}${finding.path === '/' ? '' : finding.path} [${finding.code}] ${finding.message}`,
    )
  }
}

function exitCode(status) {
  if (status === 'passed') return 0
  if (status === 'blocked') return 2
  return 1
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2))
    const result = validatePageContracts({
      projectRoot: process.cwd(),
      profile: options.profile,
      pageId: options.page,
      scope: options.scope,
    })
    printResult(result, options.format)
    process.exitCode = exitCode(result.status)
  } catch (error) {
    console.error(`Page Contract 检查器内部错误：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 3
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
