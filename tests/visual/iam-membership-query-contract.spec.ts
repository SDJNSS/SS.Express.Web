import { expect, test, type Page } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

for (const initialState of ['pending', 'failed'] as const) {
  test(`首次租户候选${initialState === 'pending' ? '挂起时清空' : '失败后选择子集'}不会覆盖显式查询`, async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const shellProfile = page.waitForResponse('**/api/iam-admin/Membership/QueryUsers')
    await page.goto('/iam/overview')
    await shellProfile
    let candidateCalls = 0
    let releaseInitial: (() => void) | undefined
    let initialFinished = false
    const queries: Record<string, unknown>[] = []
    page.on('close', () => releaseInitial?.())
    await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      if (body.user_name === '林嘉' && body.page_size === 1) {
        candidateCalls += 1
        if (candidateCalls === 1) {
          if (initialState === 'pending') {
            await new Promise<void>((resolve) => {
              releaseInitial = resolve
            })
            await route.fallback()
          } else {
            await route.fulfill({
              contentType: 'application/json',
              body: JSON.stringify({
                is_success: false,
                status: 'error',
                code: 40001,
                message: '租户候选首次加载失败',
                data: null,
              }),
            })
          }
          initialFinished = true
          return
        }
      } else queries.push(body)
      await route.fallback()
    })
    await page
      .getByRole('navigation', { name: 'IAM 身份中心导航' })
      .getByRole('link', { name: '用户与成员', exact: true })
      .click()
    const search = page.getByRole('region', { name: '查询条件' })
    const tenants = search
      .locator('.el-form-item')
      .filter({ has: page.getByRole('combobox', { name: 'Tenant', exact: true }) })
    if (initialState === 'pending') {
      await expect.poll(() => Boolean(releaseInitial)).toBe(true)
      await tenants.hover()
      await tenants.locator('.el-select__clear').click()
    } else {
      await expect(
        page.getByText('身份数据加载失败，当前列表未更新', { exact: true }),
      ).toBeVisible()
      await tenants
        .getByRole('combobox', { name: 'Tenant', exact: true })
        .press('ArrowDown')
      await page.getByRole('option', { name: '汉明巡天山东 · HMXTSD', exact: true }).click()
    }
    await search.getByPlaceholder('输入用户姓名').press('Enter')
    await expect
      .poll(() => queries.at(-1)?.tenant_ids)
      .toEqual(initialState === 'pending' ? [] : [1])
    releaseInitial?.()
    await expect.poll(() => initialFinished).toBe(true)
    expect(queries).toHaveLength(1)
    await expect(tenants.locator('.el-tag')).toHaveCount(initialState === 'pending' ? 0 : 1)
  })
}

function apiSuccess(data: unknown) {
  return JSON.stringify({ is_success: true, status: 'success', code: 1, message: '', data })
}

test('查询按钮只发送一次 QueryUsers 且直接使用当前业务筛选条件', async ({ page }) => {
  await useAuthenticatedSession(page)
  const requests: Record<string, unknown>[] = []
  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fallback()
  })
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()

  requests.length = 0
  const search = page.getByRole('region', { name: '查询条件' })
  await search.getByPlaceholder('输入用户姓名').fill('林')
  const businessRequest = page.waitForRequest((request) => {
    if (!request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) return false
    return (request.postDataJSON() as Record<string, unknown>).real_name === '林'
  })
  await search.getByRole('button', { name: '查询', exact: true }).click()
  await businessRequest

  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({
    tenant_ids: [1, 3],
    real_name: '林',
    page_index: 1,
    page_size: 1000,
  })
  expect(requests[0]).not.toMatchObject({ user_name: '林嘉', page_size: 1 })
})

for (const retryMode of ['automatic', 'explicit'] as const) {
  test(`租户缓存为空且首次加载失败，${retryMode === 'automatic' ? '自动重试恢复默认全选' : '显式空查询始终保留空选择'}`, async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.addInitScript(() => window.sessionStorage.setItem('login_available_tenants', '[]'))
    const shellProfile = page.waitForResponse('**/api/iam-admin/Membership/QueryUsers')
    await page.goto('/iam/overview')
    await shellProfile
    let candidateCalls = 0
    const queries: Record<string, unknown>[] = []
    await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      if (body.user_name === '林嘉' && body.page_size === 1) {
        candidateCalls += 1
        if (candidateCalls === 1) {
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              is_success: false,
              status: 'error',
              code: 40001,
              message: '租户候选首次加载失败',
              data: null,
            }),
          })
          return
        }
      } else queries.push(body)
      await route.fallback()
    })
    await page
      .getByRole('navigation', { name: 'IAM 身份中心导航' })
      .getByRole('link', { name: '用户与成员', exact: true })
      .click()
    await expect(page.getByText('身份数据加载失败，当前列表未更新', { exact: true })).toBeVisible()
    const search = page.getByRole('region', { name: '查询条件' })
    if (retryMode === 'automatic')
      await page.getByRole('button', { name: '重新加载', exact: true }).click()
    else await search.getByPlaceholder('输入用户姓名').press('Enter')
    await expect
      .poll(() => queries.at(-1)?.tenant_ids)
      .toEqual(retryMode === 'automatic' ? [1, 3] : [])
    await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
    const tenants = search
      .locator('.el-form-item')
      .filter({ has: page.getByRole('combobox', { name: 'Tenant', exact: true }) })
    await expect(tenants.locator('.el-tag')).toHaveCount(retryMode === 'automatic' ? 2 : 0)
    if (retryMode === 'explicit') {
      await search.getByRole('button', { name: '查询', exact: true }).click()
      await expect.poll(() => queries.length).toBe(2)
      expect(queries.at(-1)?.tenant_ids).toEqual([])
      await expect(tenants.locator('.el-tag')).toHaveCount(0)
    }
  })
}

function memberRecord(fresh = false, relationSaved?: 'organization' | 'position') {
  return {
    user_id: 1001,
    tenant_user_id: 1,
    tenant_id: 1,
    tenant_code: 'PLATFORM',
    tenant_user_code: 'PLATFORM_1',
    display_name: '林嘉',
    user_status: 'ACTIVE',
    member_status: 'ACTIVE',
    user_version: '63924670932147368',
    member_version: '63924670932147368',
    is_tenant_admin: true,
    is_member_currently_effective: true,
    joined_at: '2026-01-01T00:00:00Z',
    left_at: '',
    user: {
      id: 1001,
      user_name: 'linjia',
      real_name: '林嘉',
      nick_name: '嘉嘉',
      phone: '13800000000',
      email: 'linjia@example.com',
      avatar_url: '',
      user_type: 'Platform',
      status: 'ACTIVE',
      version: '63924670932147368',
      updated_at: '2026-09-18T00:00:00Z',
      remarks: fresh ? '详情是服务端最新资料' : '列表中的旧资料',
    },
    memberships: [],
    organizations:
      relationSaved === 'organization'
        ? [
            {
              id: 99,
              tenant_user_id: 1,
              org_id: 10,
              org_code: 'ORG10',
              org_name: '研发组织',
              is_primary: true,
              effective_start: '2026-01-01 00:00:00',
              effective_end: '',
              status: 'ACTIVE',
              is_currently_effective: true,
              version: '1',
              remarks: '',
            },
          ]
        : [],
    positions:
      relationSaved === 'position'
        ? [
            {
              id: 100,
              tenant_user_id: 1,
              position_id: 20,
              position_code: 'POS20',
              position_name: '培训岗位',
              is_primary: true,
              effective_start: '2026-01-01 00:00:00',
              effective_end: '',
              status: 'ACTIVE',
              is_currently_effective: true,
              version: '1',
              remarks: '',
            },
          ]
        : [],
  }
}

async function mockCandidates(page: Page, requests: Record<string, unknown>[]) {
  await page.route('**/api/iam-admin/Membership/QueryFilterOptions', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    requests.push(body)
    const data = {
      organization: { id: 10, tenant_id: 1, code: 'ORG10', name: '研发组织' },
      position: { id: 20, tenant_id: 3, code: 'POS20', name: '培训岗位' },
      role: { id: 30, tenant_id: 3, code: 'ROLE30', name: '运营角色' },
    }[body.kind as 'organization' | 'position' | 'role']
    if ((body.tenant_ids as number[]).length === 1)
      data.tenant_id = (body.tenant_ids as number[])[0]!
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        total: 1,
        page_index: body.page_index,
        page_size: body.page_size,
        items: [data],
      }),
    })
  })
}

test('成员查询使用精确身份和新筛选字段，候选按租户按需分页，清空租户清空候选', async ({ page }) => {
  await useAuthenticatedSession(page)
  const candidates: Record<string, unknown>[] = []
  const queries: Record<string, unknown>[] = []
  await mockCandidates(page, candidates)
  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    if (body.user_name === '林嘉' && body.page_size === 1) return route.fallback()
    queries.push(body)
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({
        total: 1,
        page_index: 1,
        page_size: body.page_size,
        items: [memberRecord()],
      }),
    })
  })
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  expect(candidates).toHaveLength(0)
  expect(queries.at(-1)?.tenant_ids).toEqual([1, 3])
  const search = page.getByRole('region', { name: '查询条件' })
  await search.getByPlaceholder('输入用户姓名').fill('林')
  await search.getByPlaceholder('输入完整手机号').fill('13800000000')
  await search.getByPlaceholder('输入完整邮箱').fill('linjia@example.com')
  for (const [label, option] of [
    ['组织', '研发组织'],
    ['岗位', '培训岗位'],
    ['角色', '运营角色'],
  ]) {
    await search.getByRole('combobox', { name: label, exact: true }).click()
    await page.getByRole('option', { name: new RegExp(option!) }).click()
  }
  expect(candidates.map((item) => item.kind)).toEqual(['organization', 'position', 'role'])
  for (const request of candidates) {
    expect(request).toMatchObject({ tenant_ids: [1, 3], page_index: 1, page_size: 20 })
  }
  await search.getByRole('button', { name: '更多筛选' }).click()
  await search.getByPlaceholder('精确用户 ID').fill('1001')
  await search.getByPlaceholder('精确账号').fill('linjia')
  await search.getByRole('button', { name: '查询', exact: true }).click()
  await expect
    .poll(() => queries.at(-1))
    .toMatchObject({
      tenant_ids: [1, 3],
      user_id: 1001,
      user_name: 'linjia',
      real_name: '林',
      phone: '13800000000',
      email: 'linjia@example.com',
      org_id: 10,
      position_id: 20,
      role_id: 30,
    })
  expect(queries.at(-1)).not.toHaveProperty('tenant_user_id')
  expect(queries.at(-1)).not.toHaveProperty('keyword')
  const tenantSelect = search
    .locator('.el-form-item')
    .filter({ has: page.locator('label').filter({ hasText: /^Tenant$/ }) })
  await tenantSelect.hover()
  await tenantSelect.locator('.el-select__clear').click()
  for (const label of ['组织', '岗位', '角色']) {
    await expect(search.getByRole('combobox', { name: label, exact: true })).toBeDisabled()
  }
  await search.getByRole('button', { name: '查询', exact: true }).click()
  await expect.poll(() => queries.at(-1)?.tenant_ids).toEqual([])
  expect(queries.at(-1)).not.toHaveProperty('org_id')
  expect(queries.at(-1)).not.toHaveProperty('position_id')
  expect(queries.at(-1)).not.toHaveProperty('role_id')
  expect(candidates).toHaveLength(3)
})

for (const relationCase of [
  {
    kind: 'organization',
    label: '组织',
    name: '研发组织',
    api: 'SaveOrganization',
    target: { org_id: 10 },
  },
  {
    kind: 'position',
    label: '岗位',
    name: '培训岗位',
    api: 'SavePosition',
    target: { position_id: 20 },
  },
] as const) {
  test(`详情重新查询当前用户及租户，${relationCase.label}保存后重新查询并更新详情`, async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const candidates: Record<string, unknown>[] = []
    const detailQueries: Record<string, unknown>[] = []
    const savedRelations: Record<string, unknown>[] = []
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await mockCandidates(page, candidates)
    await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      if (body.user_name === '林嘉' && body.page_size === 1) return route.fallback()
      const fresh = body.user_id === 1001 && body.page_size === 1
      if (fresh) detailQueries.push(body)
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          total: 1,
          page_index: 1,
          page_size: body.page_size,
          items: [memberRecord(fresh, savedRelations.length ? relationCase.kind : undefined)],
        }),
      })
    })
    await page.route(`**/api/iam-admin/Membership/${relationCase.api}`, async (route) => {
      savedRelations.push(route.request().postDataJSON() as Record<string, unknown>)
      await route.fulfill({ contentType: 'application/json', body: apiSuccess({}) })
    })
    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).click()
    const detail = page.getByRole('dialog', { name: /身份详情/ })
    await expect(detail.getByText('详情是服务端最新资料')).toBeVisible()
    expect(detailQueries).toHaveLength(1)
    expect(detailQueries[0]).toMatchObject({
      user_id: 1001,
      tenant_ids: [1],
      page_index: 1,
      page_size: 1,
    })
    expect(detailQueries[0]).not.toHaveProperty('tenant_user_id')
    await detail.getByRole('tab', { name: `${relationCase.label}归属`, exact: true }).click()
    await detail.getByRole('button', { name: `新增${relationCase.label}归属` }).click()
    const relation = page.getByRole('dialog', {
      name: `维护${relationCase.label}归属`,
      exact: true,
    })
    await relation.getByRole('button', { name: `保存${relationCase.label}归属` }).click()
    await expect(relation.getByText('请选择目标归属')).toBeVisible()
    expect(savedRelations).toHaveLength(0)
    await relation.getByRole('combobox', { name: `目标${relationCase.label}` }).click()
    await page.getByRole('option', { name: new RegExp(relationCase.name) }).click()
    expect(candidates.at(-1)).toMatchObject({
      tenant_ids: [1],
      kind: relationCase.kind,
      page_index: 1,
      page_size: 20,
    })
    await relation.getByPlaceholder('请选择有效开始时间').fill('2026-01-01 00:00:00')
    await relation.getByPlaceholder('请选择有效开始时间').press('Tab')
    await relation.getByRole('button', { name: `保存${relationCase.label}归属` }).click()
    await expect(relation).toBeHidden()
    await expect(detail.getByText(relationCase.name, { exact: true })).toBeVisible()
    expect(detailQueries).toHaveLength(2)
    expect(savedRelations[0]).toMatchObject({ tenant_user_id: 1, ...relationCase.target })
    expect(errors).toEqual([])
  })
}

test('多租户候选支持翻页，切换租户后迟到候选不能回填', async ({ page }) => {
  await useAuthenticatedSession(page)
  const requests: Record<string, unknown>[] = []
  let releaseOld: (() => void) | undefined
  let oldReleased = false
  await page.route('**/api/iam-admin/Membership/QueryFilterOptions', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    requests.push(body)
    const isMultiTenant = (body.tenant_ids as number[]).length === 2
    let items: Array<{ id: number; tenant_id: number; code: string; name: string }>
    let total: number
    if (isMultiTenant && body.keyword === '迟到') {
      await new Promise<void>((resolve) => {
        releaseOld = resolve
      })
      items = [{ id: 999, tenant_id: 3, code: 'OLD', name: '旧租户迟到组织' }]
      total = 1
    } else if (isMultiTenant) {
      items =
        body.page_index === 2
          ? [{ id: 121, tenant_id: 3, code: 'ORG121', name: '第二页组织' }]
          : Array.from({ length: 20 }, (_, index) => ({
              id: 100 + index,
              tenant_id: index % 2 ? 3 : 1,
              code: `ORG${index}`,
              name: `第一页组织${index}`,
            }))
      total = 21
    } else {
      items = [{ id: 201, tenant_id: 1, code: 'LATEST', name: '本租户最新组织' }]
      total = 1
    }
    await route
      .fulfill({
        contentType: 'application/json',
        body: apiSuccess({ items, total, page_index: body.page_index, page_size: body.page_size }),
      })
      .catch(() => undefined)
    if (body.keyword === '迟到' && isMultiTenant) oldReleased = true
  })
  await page.goto('/iam/members')
  await expect(page.getByRole('button', { name: '详情', exact: true })).toBeVisible()
  const search = page.getByRole('region', { name: '查询条件' })
  const organization = search.getByRole('combobox', { name: '组织', exact: true })
  await organization.click()
  await expect(page.getByRole('option', { name: /第一页组织0 ·/ })).toBeVisible()
  await page
    .locator('.el-select__popper:visible')
    .getByRole('button', { name: '下一页', exact: true })
    .click()
  await expect(page.getByRole('option', { name: /第二页组织/ })).toBeVisible()
  expect(requests.at(-1)).toMatchObject({
    tenant_ids: [1, 3],
    kind: 'organization',
    page_index: 2,
    page_size: 20,
  })
  await organization.fill('迟到')
  await expect.poll(() => Boolean(releaseOld)).toBe(true)
  await page.getByRole('heading', { name: '用户与成员', exact: true }).click()
  await expect(page.locator('.el-select__popper:visible')).toHaveCount(0)
  const tenantSelect = search
    .locator('.el-form-item')
    .filter({ has: page.getByRole('combobox', { name: 'Tenant', exact: true }) })
  await tenantSelect
    .getByRole('combobox', { name: 'Tenant', exact: true })
    .press('ArrowDown')
  await page.getByRole('option', { name: '汉明巡天山东 · HMXTSD', exact: true }).click()
  await page.getByRole('heading', { name: '用户与成员', exact: true }).click()
  await organization.click()
  await expect(page.getByRole('option', { name: /本租户最新组织/ })).toBeVisible()
  expect(requests.at(-1)).toMatchObject({
    tenant_ids: [1],
    kind: 'organization',
    page_index: 1,
    page_size: 20,
  })
  expect(requests.at(-1)).not.toHaveProperty('keyword')
  releaseOld?.()
  await expect.poll(() => oldReleased).toBe(true)
  await expect(page.getByRole('option', { name: /旧租户迟到组织/ })).toBeHidden()
  await expect(page.getByRole('option', { name: /本租户最新组织/ })).toBeVisible()
})
