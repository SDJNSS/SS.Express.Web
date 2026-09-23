import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const checker = fileURLToPath(
  new URL('../../scripts/check-frontend-standards.mjs', import.meta.url),
)

function runChecker(files) {
  const root = mkdtempSync(join(tmpdir(), 'ss-express-standards-'))
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'UIDesign', 'src'), { recursive: true })

  try {
    for (const [path, content] of Object.entries(files)) {
      const absolutePath = join(root, ...path.split('/'))
      mkdirSync(dirname(absolutePath), { recursive: true })
      writeFileSync(absolutePath, content)
    }

    return spawnSync(process.execPath, [checker], {
      cwd: root,
      encoding: 'utf8',
    })
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

test('allows UIDesign to load the canonical public preview entry', () => {
  const result = runChecker({
    'src/features/tms/orders/public.preview.ts':
      "export { default } from './preview/OrderListPreviewPage.vue'\n",
    'src/features/tms/orders/preview/OrderListPreviewPage.vue': '<template><div /></template>\n',
    'UIDesign/src/catalog.ts':
      "export const load = () => import('@feature-preview/tms/orders/public.preview')\n",
  })

  assert.equal(result.status, 0, result.stderr)
})

test('rejects production imports from preview-only directories', () => {
  const result = runChecker({
    'src/features/tms/orders/components/Consumer.ts':
      "import fixture from '../preview/order.fixture'\nexport default fixture\n",
    'src/features/tms/orders/preview/order.fixture.ts': 'export default {}\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /生产代码禁止导入 Preview-only 代码/u)
})

test('rejects a public preview entry that exports a production page', () => {
  const result = runChecker({
    'src/features/tms/orders/public.preview.ts':
      "export { default } from './pages/OrderListPage.vue'\n",
    'src/features/tms/orders/pages/OrderListPage.vue': '<template><div /></template>\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /public\.preview\.ts 只能导出同 Feature/u)
})

test('rejects real infrastructure and network calls in preview code', () => {
  const result = runChecker({
    'src/features/tms/orders/preview/load.ts':
      "import api from '../api/orders'\nnew WebSocket('wss://example.invalid')\nexport default api\n",
    'src/features/tms/orders/api/orders.ts': 'export default {}\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /禁止连接真实 API/u)
  assert.match(result.stderr, /禁止直接发起网络请求/u)
})

test('allows Axios only in the shared HTTP client', () => {
  const result = runChecker({
    'src/features/tms/orders/api/orderApi.ts':
      "import axios from 'axios'\nexport const load = () => axios.get('/orders')\n",
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /只有 src\/shared\/api\/httpClient\.ts 可以直接导入 Axios/u)
})

test('requires feature pages and composables to use their feature API layer', () => {
  const result = runChecker({
    'src/features/tms/orders/composables/useOrders.ts':
      "import client from '@shared/api/httpClient'\nexport const load = () => client.get('/orders')\n",
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /本 Feature 的 api\/ 目录/u)
})

test('rejects hardcoded hosts inside feature API modules', () => {
  const result = runChecker({
    'src/features/tms/orders/api/orderApi.ts':
      "export const endpoint = 'https://api.example.invalid/orders'\n",
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Feature API 禁止硬编码 Host/u)
})

test('rejects numeric IAM concurrency versions and conversion attempts', () => {
  const numericType = runChecker({
    'src/features/iam/application-resources/api/catalog.ts':
      'export interface Resource { version: number }\n',
  })
  const numericConversion = runChecker({
    'src/features/iam/application-resources/api/catalog.ts':
      'export const normalize = (version: string) => Number(version)\n',
  })

  assert.equal(numericType.status, 1)
  assert.match(numericType.stderr, /IAM 并发版本必须使用 VersionToken/u)
  assert.equal(numericConversion.status, 1)
  assert.match(numericConversion.stderr, /禁止数值转换/u)
})

test('requires an explicit placeholder status for every FeatureScaffold route', () => {
  const missingStatus = runChecker({
    'src/features/tms/orders/routes.ts': `
      export const routes = [{
        path: 'tms/orders',
        component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
        meta: { title: '运输订单' },
      }]
    `,
  })
  const explicitStatus = runChecker({
    'src/features/tms/routes.ts': `
      export const routes = [{
        path: 'tms/orders',
        component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
        meta: { title: '运输订单', implementationStatus: 'placeholder' },
      }]
    `,
  })

  assert.equal(missingStatus.status, 1)
  assert.match(missingStatus.stderr, /FeatureScaffoldPage 占位路由/u)
  assert.equal(explicitStatus.status, 0, explicitStatus.stderr)
})

test('rejects misplaced placeholder markers and markers retained by real pages', () => {
  const misplacedStatus = runChecker({
    'src/features/tms/routes.ts': `
      export const routes = [
        {
          path: 'tms/orders',
          component: () => import('@shared/business-components/FeatureScaffoldPage.vue'),
          meta: { title: '运输订单' },
        },
        {
          path: 'tms/other',
          component: () => import('./OtherPage.vue'),
          meta: { title: '其他页面', implementationStatus: 'placeholder' },
        },
      ]
    `,
  })

  assert.equal(misplacedStatus.status, 1)
  assert.match(misplacedStatus.stderr, /同一路由对象/u)
})

test('requires Reference routes to be registered only in development', () => {
  const productionLeak = runChecker({
    'src/app/router/index.ts': `
      import { referenceRoutes } from '@features/reference/routes'
      const developmentReferenceRoutes = import.meta.env.DEV ? referenceRoutes : []
      export const routes = [...referenceRoutes]
    `,
  })
  const developmentOnly = runChecker({
    'src/app/router/index.ts': `
      import { referenceRoutes } from '@features/reference/routes'
      const developmentReferenceRoutes = import.meta.env.DEV ? referenceRoutes : []
      export const routes = [...developmentReferenceRoutes]
    `,
  })

  assert.equal(productionLeak.status, 1)
  assert.match(productionLeak.stderr, /Reference 示例路由只能/u)
  assert.equal(developmentOnly.status, 0, developmentOnly.stderr)
})

test('requires production permission-page discovery to exclude Reference pages', () => {
  const productionLeak = runChecker({
    'src/app/composables/useAppShellContext.ts': `
      const pages = import.meta.glob('../../features/**/pages/*.vue')
    `,
  })
  const excludedReference = runChecker({
    'src/app/composables/useAppShellContext.ts': `
      const pages = import.meta.glob([
        '../../features/**/pages/*.vue',
        '!../../features/reference/**/*.vue',
      ])
    `,
  })

  assert.equal(productionLeak.status, 1)
  assert.match(productionLeak.stderr, /动态页面模块映射必须显式排除/u)
  assert.equal(excludedReference.status, 0, excludedReference.stderr)
})

test('derives subsystem feature boundaries without a subsystem allowlist', () => {
  const result = runChecker({
    'src/features/wms/orders/components/Consumer.ts':
      "import value from '@features/wms/trips/components/value'\nexport default value\n",
    'src/features/wms/trips/components/value.ts': 'export default 1\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /wms\/orders 禁止深层导入 wms\/trips/u)
})

test('rejects MDI icons that are not bundled in the local registry', () => {
  const result = runChecker({
    'src/features/tms/orders/components/icon.ts': "export const icon = 'mdi:cloud-off-outline'\n",
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /必须在 src\/shared\/icons\/registerIcons\.ts 本地注册/u)
})

test('allows a standard page composed from AppPage and a PageTemplate', () => {
  const result = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage><ListPageTemplate /></AppPage></template>
    `,
  })

  assert.equal(result.status, 0, result.stderr)
})

test('rejects a PageTemplate rendered outside AppPage', () => {
  const result = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><ListPageTemplate /></template>
    `,
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /PageTemplate 必须放在 AppPage 内容容器内/u)
})

test('allows a production page to delegate to its canonical Page View', () => {
  const result = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import OrderListPageView from '../components/OrderListPageView.vue'
      </script>
      <template><OrderListPageView /></template>
    `,
    'src/features/tms/orders/components/OrderListPageView.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage><ListPageTemplate /></AppPage></template>
    `,
  })

  assert.equal(result.status, 0, result.stderr)
})

test('allows a canonical Page View to delegate one content pattern layer to a shared feature panel', () => {
  const result = runChecker({
    'src/features/iam/access-control/components/RoleFunctionPermissionPageView.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import FunctionPermissionPanel from './FunctionPermissionPanel.vue'
      </script>
      <template><AppPage><FunctionPermissionPanel /></AppPage></template>
    `,
    'src/features/iam/access-control/components/FunctionPermissionPanel.vue': `
      <script setup lang="ts">
      import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
      </script>
      <template><WorkspacePageTemplate /></template>
    `,
  })

  assert.equal(result.status, 0, result.stderr)
})

test('rejects a canonical Page View without AppPage and PageTemplate', () => {
  const result = runChecker({
    'src/features/tms/orders/components/OrderListPageView.vue': '<template><main /></template>\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Canonical Page View 必须组合 AppPage/u)
})

test('allows a registered standalone authentication Page View without AppPage', () => {
  const result = runChecker({
    'src/features/iam/login/components/LoginPageView.vue': `
      <script setup lang="ts">
      import AuthPageTemplate from '@shared/components/page-templates/AuthPageTemplate.vue'
      </script>
      <template><AuthPageTemplate /></template>
    `,
  })

  assert.equal(result.status, 0, result.stderr)
})

test('rejects a standalone authentication pattern inside AppPage', () => {
  const result = runChecker({
    'src/features/iam/login/components/LoginPageView.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import AuthPageTemplate from '@shared/components/page-templates/AuthPageTemplate.vue'
      </script>
      <template><AppPage><AuthPageTemplate /></AppPage></template>
    `,
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /standalone PageTemplate 不得放入/u)
})

test('rejects AppShell ownership inside production Feature code but allows Preview binding', () => {
  const productionResult = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import AppShell from '@shared/components/AppShell.vue'
      </script>
      <template><AppShell /></template>
    `,
  })
  const previewResult = runChecker({
    'src/features/tms/orders/preview/OrderListPreviewPage.vue': `
      <script setup lang="ts">
      import AppShell from '@shared/components/AppShell.vue'
      </script>
      <template><AppShell /></template>
    `,
  })

  assert.equal(productionResult.status, 1)
  assert.match(productionResult.stderr, /生产壳层只能由 AppLayout 持有/u)
  assert.equal(previewResult.status, 0, previewResult.stderr)
})

test('rejects viewport-sized page roots', () => {
  const result = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage><ListPageTemplate /></AppPage></template>
      <style scoped>
      .order-page { min-width: 1440px; height: 100vh; }
      </style>
    `,
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /页面不得使用视口单位固定宽高/u)
  assert.match(result.stderr, /页面不得设置桌面视口级固定宽度/u)
})

test('allows an AppPage root to preserve its vertical scroll fallback', () => {
  const result = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage class="order-page"><ListPageTemplate /></AppPage></template>
      <style scoped>
      .order-page { overflow-y: auto; }
      </style>
    `,
  })

  assert.equal(result.status, 0, result.stderr)
})

test('rejects feature CSS that clips an AppPage root', () => {
  const hiddenResult = runChecker({
    'src/features/tms/orders/pages/OrderListPage.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage class="order-page"><ListPageTemplate /></AppPage></template>
      <style scoped>
      .order-page {
        overflow: hidden;
      }
      </style>
    `,
  })
  const clipResult = runChecker({
    'src/features/tms/orders/components/OrderListPageView.vue': `
      <script setup lang="ts">
      import AppPage from '@shared/components/AppPage.vue'
      import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
      </script>
      <template><AppPage class="order-page"><ListPageTemplate /></AppPage></template>
      <style scoped>
      .order-page { overflow-y: clip; }
      </style>
    `,
  })

  assert.equal(hiddenResult.status, 1)
  assert.match(hiddenResult.stderr, /AppPage 页面根 \.order-page 不得使用 overflow/u)
  assert.equal(clipResult.status, 1)
  assert.match(clipResult.stderr, /AppPage 页面根 \.order-page 不得使用 overflow/u)
})

test('requires AppPage for registered full-page components and special state pages', () => {
  const result = runChecker({
    'src/shared/business-components/SubsystemWorkspace.vue': '<template><main /></template>\n',
    'src/features/not-found/pages/NotFoundPage.vue': '<template><main /></template>\n',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /登记的全页业务组件必须由 AppPage/u)
  assert.match(result.stderr, /特殊状态页可以省略 PageTemplate/u)
})
