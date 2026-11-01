import { expect, test } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'
import { sourceHost } from './helpers/testServers'

const endpoint = '**/api/iam-admin/CurrentPermissionResource/CurrentPageResources'
const success = (data: unknown) =>
  JSON.stringify({ data, is_success: true, code: 1, status: 'success', message: '' })
const pageGrant = (code: string, buttons: string[] = [], canAccess = true) => ({
  page_resource_code: code,
  can_access: canAccess,
  button_resource_codes: buttons,
  button_page_resource_codes: [],
  read_function_resource_codes: [],
  authorization_version: '63924670932147368001',
})

test('new exact Button enables only its corresponding legacy UI predicate', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await useAuthenticatedSession(page)
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success(pageGrant('IAM.GROUP', ['IAM.GROUP.BUTTON.EDIT'])),
    }),
  )
  await page.goto('/iam/group')
  await expect(page.getByRole('button', { name: '编辑集团信息' })).toBeVisible()
  await page.getByRole('button', { name: '编辑集团信息' }).click()
  await expect(page.getByRole('dialog', { name: '编辑集团信息' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '编辑集团信息' })).toBeHidden()
  expect(errors).toEqual([])
  await page.screenshot({
    path: `C:/Users/75946/AppData/Local/Temp/iam-api-migration-${testInfo.project.name}.png`,
  })
})

test('parent, old permission strings and a foreign Button cannot grant an edit', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() =>
    sessionStorage.setItem('login_permissions', JSON.stringify(['iam:group:update'])),
  )
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        ...pageGrant('IAM.GROUP', ['IAM.TENANTS.BUTTON.EDIT']),
        permission_codes: ['iam:group:update'],
      }),
    }),
  )
  await page.goto('/iam/group')
  await expect(page.getByText('陆链物流集团', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '编辑集团信息' })).toBeHidden()
})

test('explicit denial blocks business reads even if navigation contains the Menu', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  let reads = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/Group/Info')) reads++
  })
  await page.route(endpoint, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success(pageGrant('IAM.GROUP', [], false)),
    }),
  )
  await page.goto('/iam/group')
  await expect(page).toHaveURL(/\/forbidden\?from=/)
  expect(reads).toBe(0)
})

test('mismatched page identity is a service error, not an authorization grant', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.route(endpoint, (route) =>
    route.fulfill({ contentType: 'application/json', body: success(pageGrant('IAM.TENANTS')) }),
  )
  await page.goto('/iam/group')
  await expect(page).toHaveURL(/\/authorization-service-error\?from=/)
  await expect(page.getByRole('button', { name: '重新校验' })).toBeVisible()
})

test('Page authorization does not wait for a Menu ID and never calls deprecated endpoints', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  const obsolete: string[] = []
  page.on('request', (request) => {
    if (/\/Permission\/Current|\/AuthorizationCatalog\/QuerySystems/.test(request.url()))
      obsolete.push(request.url())
  })
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentAppMenus', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  )
  let body: unknown
  await page.route(endpoint, (route) => {
    body = route.request().postDataJSON()
    return route.fulfill({
      contentType: 'application/json',
      body: success(pageGrant('IAM.GROUP', ['IAM.GROUP.BUTTON.EDIT'])),
    })
  })
  await page.goto('/iam/group')
  await expect(page.getByRole('button', { name: '编辑集团信息' })).toBeVisible()
  expect(body).toEqual({ page_resource_code: 'IAM.GROUP' })
  expect(obsolete).toEqual([])
})

test('page-resource cache isolates login tokens and force refresh supersedes older responses', async ({
  page,
}) => {
  const held: Array<() => Promise<void>> = []
  let requests = 0
  await page.route(endpoint, async (route) => {
    requests++
    const index = requests
    if (index <= 2) {
      held.push(() =>
        route.fulfill({
          contentType: 'application/json',
          body: success(pageGrant('IAM.GROUP', index === 1 ? ['IAM.GROUP.BUTTON.EDIT'] : [])),
        }),
      )
    } else
      await route.fulfill({
        contentType: 'application/json',
        body: success(pageGrant('IAM.GROUP')),
      })
  })
  await page.goto(`${sourceHost}/login`)
  await page.evaluate(async () => {
    sessionStorage.setItem('access_token', 'cache-user-a')
    sessionStorage.setItem('login_state', 'READY')
    sessionStorage.setItem('login_account', 'cache-test-user')
    sessionStorage.setItem('login_tenant_id', '1')
    const path = '/src/features/iam/shell-context/services/currentPageResourceAccess.ts'
    const api = await import(/* @vite-ignore */ path)
    api.clearCurrentPageResourceAccessCache()
    const first = api.getCurrentPageResourcesCached('IAM.GROUP')
    const second = api.getCurrentPageResourcesCached('IAM.GROUP', { force: true })
    Object.assign(window, { migrationCache: { api, first, second } })
  })
  await expect.poll(() => held.length).toBe(2)
  await held[1]!()
  await page.evaluate(async () => {
    await (window as unknown as { migrationCache: { second: Promise<unknown> } }).migrationCache
      .second
  })
  await held[0]!()
  const buttons = await page.evaluate(async () => {
    const ctx = (
      window as unknown as {
        migrationCache: {
          first: Promise<unknown>
          api: {
            getCurrentPageResourcesCached: (
              code: string,
            ) => Promise<{ button_resource_codes: string[] }>
          }
        }
      }
    ).migrationCache
    await ctx.first
    return (await ctx.api.getCurrentPageResourcesCached('IAM.GROUP')).button_resource_codes
  })
  expect(buttons).toEqual([])
  expect(requests).toBe(2)
  await page.evaluate(async () => {
    sessionStorage.setItem('access_token', 'cache-user-b')
    const path = '/src/features/iam/shell-context/services/currentPageResourceAccess.ts'
    const api = await import(/* @vite-ignore */ path)
    await api.getCurrentPageResourcesCached('IAM.GROUP')
  })
  expect(requests).toBe(3)
  await page.evaluate(async () => {
    sessionStorage.setItem('login_tenant_id', '3')
    const path = '/src/features/iam/shell-context/services/currentPageResourceAccess.ts'
    const api = await import(/* @vite-ignore */ path)
    await api.getCurrentPageResourcesCached('IAM.GROUP')
  })
  expect(requests).toBe(4)
})

test('shared catalog pages still require a selected tenant before authorization or business reads', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  await page.addInitScript(() => sessionStorage.removeItem('login_tenant_id'))
  const requests: string[] = []
  page.on('request', (request) => {
    if (/\/CurrentPermissionResource\/|\/Group\/Info$|\/Tenant\/Query$/u.test(request.url())) {
      requests.push(request.url())
    }
  })
  for (const path of ['/iam/group', '/iam/tenants', '/iam/system-resources']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/iam\/select-tenant$/u)
  }
  expect(requests).toEqual([])
})

test('SA identity and cached grants cannot replace current-tenant group and tenant Menu grants', async ({
  page,
}) => {
  await useAuthenticatedSession(page, { excludedMenuPaths: ['/iam/group', '/iam/tenants'] })
  await page.addInitScript(() => {
    sessionStorage.setItem('login_account', 'SA')
    sessionStorage.setItem(
      'login_permissions',
      JSON.stringify([
        'SA',
        'iam:group:view',
        'iam:group:update',
        'iam:tenants:view',
        'iam:tenants:update',
      ]),
    )
  })
  let reads = 0
  page.on('request', (request) => {
    if (/\/Group\/Info$|\/Tenant\/Query$/u.test(request.url())) reads += 1
  })
  await page.goto('/iam/overview')
  const navigation = page.getByRole('navigation', { name: 'IAM 身份中心导航' })
  await expect(navigation.getByRole('link', { name: '身份总览', exact: true })).toBeVisible()
  await expect(navigation.getByRole('link', { name: /集团信息|Tenant 管理/u })).toHaveCount(0)
  for (const path of ['/iam/group', '/iam/tenants']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/forbidden\?from=/u)
  }
  expect(reads).toBe(0)
})

test('Tenant directory targets may differ from current tenant without becoming switch candidates', async ({
  page,
}) => {
  await useAuthenticatedSession(page)
  const tenant = {
    id: 99,
    group_id: 1,
    tenant_code: 'DIRECTORY',
    tenant_name: '目录租户',
    tenant_type: 'enterprise',
    company_name: '目录租户',
    status: 'ACTIVE',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    sort_order: 0,
    version: '99',
  }
  const writes: Record<string, unknown>[] = []
  await page.route('**/api/iam-admin/Tenant/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({ items: [tenant], total: 1, page_index: 1, page_size: 1000 }),
    }),
  )
  await page.route('**/api/iam-admin/Tenant/Update', (route) => {
    writes.push(route.request().postDataJSON())
    return route.fulfill({ contentType: 'application/json', body: success(tenant) })
  })
  await page.goto('/iam/tenants')
  await expect(page.getByRole('cell', { name: '目录租户', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '编辑 目录租户', exact: true })
  await drawer.getByLabel('Tenant 名称', { exact: true }).fill('目录租户改名')
  await drawer.getByRole('button', { name: '保存 Tenant', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toMatchObject({ id: 99, tenant_name: '目录租户改名', version: '99' })
  expect(writes[0]).not.toHaveProperty('tenant_id')
  await expect(drawer).toBeHidden()
  await page.goto('/iam/select-tenant')
  await expect(page.getByText('目录租户', { exact: true })).toHaveCount(0)
  await expect(page.getByText('汉明巡天山东', { exact: true })).toBeVisible()
})
