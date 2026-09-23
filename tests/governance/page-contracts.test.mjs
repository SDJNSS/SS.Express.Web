import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { afterEach, test } from 'node:test'

import {
  canonicalContractSha256,
  validatePageContracts,
} from '../../scripts/check-page-contracts.mjs'

const projectRoot = fileURLToPath(new URL('../..', import.meta.url))
const temporaryRoots = []

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function writeProjectFile(root, path, content = '') {
  const target = resolve(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content, 'utf8')
}

function createFixtureProject() {
  const root = mkdtempSync(resolve(tmpdir(), 'ss-express-page-contract-'))
  temporaryRoots.push(root)

  const registry = JSON.parse(readFileSync(resolve(projectRoot, 'standards/registry.json'), 'utf8'))
  registry.pageContract.legacySpecs = []
  registry.approvalStore = null

  mkdirSync(resolve(root, 'standards/schemas'), { recursive: true })
  copyFileSync(
    resolve(projectRoot, 'standards/schemas/registry.v1.schema.json'),
    resolve(root, 'standards/schemas/registry.v1.schema.json'),
  )
  copyFileSync(
    resolve(projectRoot, 'standards/schemas/page-contract.v0.1.schema.json'),
    resolve(root, 'standards/schemas/page-contract.v0.1.schema.json'),
  )
  writeProjectFile(root, 'standards/registry.json', JSON.stringify(registry, null, 2))

  const scripts = Object.fromEntries(
    Object.values(registry.verificationEntries).map((scriptName) => [scriptName, 'node -e ""']),
  )
  writeProjectFile(root, 'package.json', JSON.stringify({ scripts }, null, 2))
  writeProjectFile(root, registry.designTokens.runtimeSource, ':root {}')
  writeProjectFile(root, registry.designTokens.designContext, '# fixture')

  const implementations = [
    ...Object.values(registry.layouts),
    ...Object.values(registry.patterns),
    ...Object.values(registry.components),
  ]
  for (const item of implementations) writeProjectFile(root, item.canonicalImplementation)

  writeProjectFile(root, 'docs/prd/tms/order-list.md', '# Order list')
  writeProjectFile(root, 'UX-CONTRACT.md', '# UX')
  mkdirSync(resolve(root, 'docs/page-specs'), { recursive: true })
  return root
}

function validContract() {
  return {
    schemaVersion: '0.1',
    page: {
      id: 'tms-order-list',
      name: '运输订单列表',
      feature: 'tms/orders',
      type: 'ListPage',
      patternKey: 'ListPageTemplate',
      revision: 1,
    },
    sources: {
      inputMode: 'prd-only',
      prd: [{ id: 'order-list-prd', ref: 'docs/prd/tms/order-list.md' }],
      api: [],
      permissions: [],
      ux: [{ id: 'platform-ux', ref: 'UX-CONTRACT.md', section: 'Dataset navigation' }],
      references: [],
    },
    implementation: {
      canonicalEntry: 'src/features/tms/orders/components/OrderListPageView.vue',
      previewEntry: 'src/features/tms/orders/public.preview.ts',
      previewBinding: 'src/features/tms/orders/preview/OrderListPreviewPage.vue',
    },
    composition: {
      layoutKey: 'AppLayout',
      regions: [
        { id: 'filters', role: 'search', order: 1 },
        { id: 'results', role: 'data', order: 2 },
      ],
      components: [
        {
          id: 'order-table',
          componentKey: 'shared.data-table',
          regionId: 'results',
          purpose: '展示查询结果',
        },
      ],
    },
    states: [
      { id: 'ready', isDefault: true, scopeRef: 'page', observableResult: '展示订单' },
      { id: 'loading', scopeRef: 'results', observableResult: '稳定加载' },
    ],
    interactions: [
      {
        id: 'search-orders',
        trigger: '提交筛选',
        targetRef: 'results',
        observableResult: '刷新结果',
        ruleRef: 'platform-ux',
      },
    ],
    mockScenarios: [
      {
        id: 'ready-default',
        isDefault: true,
        fixtureRef: 'UIDesign/fixtures/tms/orders-ready.json',
        stateRef: 'ready',
        acceptanceRefs: ['orders-visible'],
      },
    ],
    exceptions: [],
    issues: { blockers: [], deferred: [], outOfScope: [] },
    acceptance: [
      {
        id: 'orders-visible',
        sourceRef: 'order-list-prd',
        observableResult: '显示订单和分页',
        affectedScopes: ['preview-visual', 'preview-interaction'],
        stateRef: 'ready',
      },
    ],
    verification: {
      viewports: ['desktop-1366', 'desktop-1440', 'desktop-1920'],
      browserTests: ['tests/preview/tms-order-list.spec.ts'],
    },
  }
}

function writeContract(root, contract) {
  writeProjectFile(
    root,
    'docs/page-specs/tms-order-list.yaml',
    `${JSON.stringify(contract, null, 2)}\n`,
  )
}

function updateRegistry(root, mutate) {
  const registryPath = resolve(root, 'standards/registry.json')
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  mutate(registry)
  writeProjectFile(root, 'standards/registry.json', JSON.stringify(registry, null, 2))
}

function materializePreviewFiles(root, contract) {
  writeProjectFile(root, contract.implementation.canonicalEntry)
  writeProjectFile(root, contract.implementation.previewEntry)
  writeProjectFile(root, contract.implementation.previewBinding)
  writeProjectFile(root, contract.mockScenarios[0].fixtureRef, '{}')
  writeProjectFile(root, contract.verification.browserTests[0])
}

function materializeProductionFiles(root, contract) {
  materializePreviewFiles(root, contract)
  writeProjectFile(root, contract.implementation.productionBinding)
  writeProjectFile(
    root,
    contract.implementation.routeSource,
    "const route = { path: 'tms/orders', component: () => import('./orders/pages/OrderListPage.vue') }\n",
  )
}

function configureApprovalStore(root) {
  updateRegistry(root, (registry) => {
    registry.approvalStore = {
      directory: 'UIDesign/approvals',
      schema: 'standards/schemas/approval-record.v1.schema.json',
      digestAlgorithm: 'sha256-canonical-json-v1',
    }
  })
  copyFileSync(
    resolve(projectRoot, 'standards/schemas/approval-record.v1.schema.json'),
    resolve(root, 'standards/schemas/approval-record.v1.schema.json'),
  )
  mkdirSync(resolve(root, 'UIDesign/approvals'), { recursive: true })
}

function materializeApproval(root, contract, digest = canonicalContractSha256(contract)) {
  configureApprovalStore(root)
  const viewportIds = ['desktop-1366', 'desktop-1440', 'desktop-1920']
  const baselines = viewportIds.map((viewportId) => {
    const path = `UIDesign/baselines/${contract.page.id}/${viewportId}.png`
    const content = `approved-${viewportId}`
    writeProjectFile(root, path, content)
    return {
      viewportId,
      path,
      sha256: createHash('sha256').update(content).digest('hex'),
    }
  })
  writeProjectFile(
    root,
    `UIDesign/approvals/${contract.page.id}.json`,
    `${JSON.stringify(
      {
        $schema: '../../standards/schemas/approval-record.v1.schema.json',
        schemaVersion: '1.0',
        pageId: contract.page.id,
        status: 'approved',
        contract: {
          path: 'docs/page-specs/tms-order-list.yaml',
          revision: contract.page.revision,
          digestAlgorithm: 'sha256-canonical-json-v1',
          digest,
        },
        approval: {
          authority: 'human',
          approvedAt: '2026-09-04T12:00:00+08:00',
          evidence: '测试中的明确人工批准',
        },
        scope: { id: 'page-content', exceptionRefs: [] },
        viewports: viewportIds,
        baselines,
        readyText: '订单列表',
      },
      null,
      2,
    )}\n`,
  )
}

test('当前仓库的 Legacy v0 白名单与 v0.1 base 校验通过', () => {
  const result = validatePageContracts({ projectRoot, profile: 'base' })
  assert.equal(result.status, 'passed')
  assert.equal(result.summary.legacySpecs, 1)
})

test('合法 v0.1 Contract 可以在实现文件尚未创建时通过 base', () => {
  const root = createFixtureProject()
  writeContract(root, validContract())

  const result = validatePageContracts({ projectRoot: root, profile: 'base' })
  assert.equal(result.status, 'passed')
  assert.equal(result.summary.pageContracts, 1)
})

test('仓库逃逸路径会被 Schema 或语义校验拒绝', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.prd[0].ref = '../outside.md'
  writeContract(root, contract)

  const result = validatePageContracts({ projectRoot: root, profile: 'base' })
  assert.equal(result.status, 'failed')
  assert.ok(result.findings.some((finding) => finding.code === 'contract.schema'))
})

test('preview Profile 要求实际 Entry、Fixture 与 Browser Test', () => {
  const root = createFixtureProject()
  writeContract(root, validContract())

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'preview',
    pageId: 'tms-order-list',
    scope: 'preview-visual',
  })
  assert.equal(result.status, 'failed')
  assert.ok(result.findings.some((finding) => finding.code === 'contract.missing-file'))
})

test('production 前置条件完整时仍会因未配置人工 Approval Store 而阻断', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'order-api', ref: 'docs/api/orders.md' }]
  contract.sources.permissions = [{ id: 'order-permission', ref: 'docs/permissions/orders.md' }]
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/orders.md', '# API')
  writeProjectFile(root, 'docs/permissions/orders.md', '# Permission')
  materializeProductionFiles(root, contract)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(
    result.findings.some((finding) => finding.code === 'production.approval-store-not-configured'),
  )
})

test('配置 Approval Store 后缺少 Approval Record 时 production 仍然阻断', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'order-api', ref: 'docs/api/orders.md' }]
  contract.sources.permissions = [{ id: 'order-permission', ref: 'docs/permissions/orders.md' }]
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/orders.md', '# API')
  writeProjectFile(root, 'docs/permissions/orders.md', '# Permission')
  materializeProductionFiles(root, contract)
  configureApprovalStore(root)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(
    result.findings.some((finding) => finding.code === 'production.approval-record-missing'),
  )
})

test('匹配当前 Contract、Scope、Revision 与视觉基线的人工批准可以通过 production', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'order-api', ref: 'docs/api/orders.md' }]
  contract.sources.permissions = [{ id: 'order-permission', ref: 'docs/permissions/orders.md' }]
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/orders.md', '# API')
  writeProjectFile(root, 'docs/permissions/orders.md', '# Permission')
  materializeProductionFiles(root, contract)
  materializeApproval(root, contract)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'passed')
})

test('平台框架可通过显式例外将唯一 AppLayout 登记为 Production Owner', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'shell-api', ref: 'docs/api/shell.md' }]
  contract.sources.permissions = [{ id: 'shell-permission', ref: 'docs/permissions/shell.md' }]
  contract.implementation.productionBinding = 'src/app/layouts/AppLayout.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  contract.composition.components.push({
    id: 'app-shell',
    componentKey: 'shared.app-shell',
    regionId: 'results',
    purpose: '唯一生产壳层',
  })
  contract.exceptions.push({
    id: 'app-layout-production-owner',
    standardRef: 'docs/architecture.md#边界规则',
    scopeRef: 'results',
    reason: '平台框架由唯一 AppLayout 跨业务路由装配',
  })
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/shell.md', '# API')
  writeProjectFile(root, 'docs/permissions/shell.md', '# Permissions')
  materializeProductionFiles(root, contract)
  materializeApproval(root, contract)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'passed')
})

test('Contract 变化后旧 Approval digest 会阻断 production', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'order-api', ref: 'docs/api/orders.md' }]
  contract.sources.permissions = [{ id: 'order-permission', ref: 'docs/permissions/orders.md' }]
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/orders.md', '# API')
  writeProjectFile(root, 'docs/permissions/orders.md', '# Permission')
  materializeProductionFiles(root, contract)
  materializeApproval(root, contract, '0'.repeat(64))

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(result.findings.some((finding) => finding.code === 'production.approval-digest'))
})

test('production 将缺失 API 与权限权威来源报告为 blocked', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  writeContract(root, contract)
  materializeProductionFiles(root, contract)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'blocked')
  for (const code of ['production.api-source-missing', 'production.permission-source-missing']) {
    assert.ok(
      result.findings.some((finding) => finding.code === code && finding.severity === 'blocked'),
    )
  }
  assert.equal(result.summary.errors, 0)
})

test('production 会阻断影响生产绑定或生产回归的 issue', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.sources.api = [{ id: 'order-api', ref: 'docs/api/orders.md' }]
  contract.sources.permissions = [{ id: 'order-permission', ref: 'docs/permissions/orders.md' }]
  contract.implementation.productionBinding = 'src/features/tms/orders/pages/OrderListPage.vue'
  contract.implementation.productionRoute = '/tms/orders'
  contract.implementation.routeSource = 'src/features/tms/routes.ts'
  contract.issues.blockers = [
    {
      id: 'production-contract-unresolved',
      description: '生产绑定尚未确认',
      affectedScopes: ['production-binding', 'production-regression'],
    },
  ]
  writeContract(root, contract)

  writeProjectFile(root, 'docs/api/orders.md', '# API')
  writeProjectFile(root, 'docs/permissions/orders.md', '# Permission')
  materializeProductionFiles(root, contract)

  const result = validatePageContracts({
    projectRoot: root,
    profile: 'production',
    pageId: 'tms-order-list',
  })
  assert.equal(result.status, 'blocked')
  assert.ok(
    result.findings.some(
      (finding) => finding.code === 'production.blocked' && finding.severity === 'blocked',
    ),
  )
})

test('permissionFixtureRef 必须同时声明 permissionRef', () => {
  const root = createFixtureProject()
  const contract = validContract()
  contract.mockScenarios[0].permissionFixtureRef = 'UIDesign/fixtures/tms/order-permissions.json'
  writeContract(root, contract)

  const result = validatePageContracts({ projectRoot: root, profile: 'base' })
  assert.equal(result.status, 'failed')
  assert.ok(
    result.findings.some((finding) => finding.code === 'contract.permission-fixture-pairing'),
  )
})

test('Legacy allowlist 内的无版本 Page Specification 保持通过', () => {
  const root = createFixtureProject()
  const legacyPath = 'docs/page-specs/legacy-list.yaml'
  updateRegistry(root, (registry) => {
    registry.pageContract.legacySpecs = [legacyPath]
  })
  writeProjectFile(root, legacyPath, 'page:\n  id: legacy-list\n')

  const result = validatePageContracts({ projectRoot: root, profile: 'base' })
  assert.equal(result.status, 'passed')
  assert.equal(result.summary.legacySpecs, 1)
})

test('Legacy allowlist 外的无版本 Page Specification 会失败', () => {
  const root = createFixtureProject()
  writeProjectFile(root, 'docs/page-specs/unversioned.yaml', 'page:\n  id: unversioned\n')

  const result = validatePageContracts({ projectRoot: root, profile: 'base' })
  assert.equal(result.status, 'failed')
  assert.ok(result.findings.some((finding) => finding.code === 'legacy.not-allowlisted'))
})
