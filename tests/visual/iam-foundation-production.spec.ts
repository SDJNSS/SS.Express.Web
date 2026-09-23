import { expect, test } from '@playwright/test'

import { mockShellContextApis, useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

test.describe('IAM foundation production binding', () => {
  test('routes the user role and permission action and keeps data permission entry shelved', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let dataPermissionRequestCount = 0
    page.on('request', (request) => {
      if (request.url().includes('/Permission/QueryMemberDataPermissions')) {
        dataPermissionRequestCount += 1
      }
    })

    await page.goto('/iam/members')
    await expect(page.getByRole('button', { name: '更多', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '角色与权限', exact: true }).first().click()
    await expect(page).toHaveURL(/\/iam\/members\/permissions\?.*userId=1001.*tab=roles/)
    await expect(page.getByRole('tab', { name: /角色/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: /数据权限/ })).toHaveCount(0)
    expect(dataPermissionRequestCount).toBe(0)
  })

  test('manages user roles per tenant and keeps Function permissions read-only', async ({
    page,
  }) => {
    await useAuthenticatedSession(page, { tenantAdminIdentity: false })
    let assignPayload: Record<string, unknown> | undefined
    let userFunctionRequestCount = 0
    let catalogQueryCount = 0
    const memberFunctionRequests: Array<Record<string, unknown>> = []
    const roleAssignmentRequests: Array<Record<string, unknown>> = []
    const subject = {
      subject_type: 'member',
      subject_id: 1,
      tenant_id: 1,
      subject_code: 'HD0001',
      subject_name: '林嘉',
      is_currently_effective: true,
      invalid_reason: '',
      version: '63924670932147368',
    }
    const role = {
      id: 501,
      tenant_id: 1,
      tenant_code: 'PLATFORM',
      role_code: 'dispatch_manager',
      role_name: '调度经理',
      role_type: 'custom',
    }
    await page.route('**/api/iam-admin/Membership/QueryUserTenants', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          user_id: 1001,
          user_version: '63924670932147368',
          memberships: [
            {
              user_id: 1001,
              tenant_user_id: 1,
              tenant_id: 1,
              tenant_code: 'PLATFORM',
              tenant_name: '华东运营中心',
              tenant_user_code: 'HD0001',
              display_name: '林嘉',
              user_type: 'employee',
              member_status: 'ACTIVE',
              is_tenant_admin: false,
              joined_at: '2026-01-01T00:00:00Z',
              left_at: null,
              is_currently_effective: true,
              membership_is_currently_effective: true,
              member_version: '63924670932147368',
              tenant_status: 'ACTIVE',
              tenant_is_deleted: false,
              updated_at: '2026-09-01T00:00:00Z',
            },
            {
              user_id: 1001,
              tenant_user_id: 3,
              tenant_id: 3,
              tenant_code: 'HMXTSD',
              tenant_name: '汉明巡天山东',
              tenant_user_code: 'HMXTSD1001',
              display_name: '林嘉',
              user_type: 'employee',
              member_status: 'ACTIVE',
              is_tenant_admin: false,
              joined_at: '2026-01-01T00:00:00Z',
              left_at: null,
              is_currently_effective: true,
              membership_is_currently_effective: true,
              member_version: '63924670932147369',
              tenant_status: 'ACTIVE',
              tenant_is_deleted: false,
              updated_at: '2026-09-01T00:00:00Z',
            },
          ],
        }),
      })
    })
    await page.route('**/api/iam-admin/RolePermission/QueryRoles', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          total: 2,
          page_index: 1,
          page_size: 1000,
          items: [
            {
              ...role,
              sort_order: 10,
              status: 'ACTIVE',
              description: '',
              remarks: '',
              is_currently_effective: true,
              is_group_controlled: false,
              can_maintain: true,
              version: '63924670932147368',
              created_at: '2026-09-01T00:00:00Z',
              updated_at: '2026-09-01T00:00:00Z',
            },
            {
              id: 502,
              tenant_id: 1,
              tenant_code: 'PLATFORM',
              role_code: 'warehouse_operator',
              role_name: '仓库操作员',
              role_type: 'custom',
              sort_order: 20,
              status: 'ACTIVE',
              description: '',
              remarks: '',
              is_currently_effective: true,
              is_group_controlled: false,
              can_maintain: true,
              version: '63924670932147368',
              created_at: '2026-09-01T00:00:00Z',
              updated_at: '2026-09-01T00:00:00Z',
            },
          ],
        }),
      })
    })
    await page.route('**/api/iam-admin/MemberRole/Query', async (route) => {
      roleAssignmentRequests.push(route.request().postDataJSON() as Record<string, unknown>)
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          total: 1,
          page_index: 1,
          page_size: 200,
          items: [
            {
              assignment_id: 9001,
              tenant_id: 1,
              tenant_user_id: 1,
              tenant_user_code: 'HD0001',
              display_name: '林嘉',
              role_id: 501,
              role_code: 'dispatch_manager',
              role_name: '调度经理',
              role_type: 'custom',
              is_tenant_admin_identity: false,
              is_group_controlled: false,
              is_assigned: true,
              is_currently_effective: true,
              can_maintain: true,
              invalid_reason: '',
              member_version: '63924670932147368',
            },
          ],
        }),
      })
    })
    await page.route('**/api/iam-admin/MemberRole/Assign', async (route) => {
      assignPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ contentType: 'application/json', body: apiSuccess([]) })
    })
    await page.route('**/api/iam-admin/AuthorizationCatalog/QuerySystems', async (route) => {
      catalogQueryCount += 1
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'forbidden', code: 403, message: 'Tenant Admin only' }),
      })
    })
    await page.route('**/api/iam-admin/Permission/QueryUserFunctionPermissions', async (route) => {
      userFunctionRequestCount += 1
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'forbidden', code: 403, message: 'requireSA' }),
      })
    })
    await page.route(
      '**/api/iam-admin/Permission/QueryMemberFunctionPermissions',
      async (route) => {
        const request = route.request().postDataJSON() as Record<string, unknown>
        memberFunctionRequests.push(request)
        const tenantUserId = Number(request.tenant_user_id)
        await route.fulfill({
          contentType: 'application/json',
          body: apiSuccess({
            subject: {
              ...subject,
              subject_id: tenantUserId,
              tenant_id: tenantUserId === 3 ? 3 : 1,
              subject_code: tenantUserId === 3 ? 'HMXTSD1001' : 'HD0001',
            },
            roles: [role],
            direct_resource_ids: [],
            effective_resource_ids: [701],
            resource_tree: [
              {
                resource: {
                  id: 201,
                  app_id: 3,
                  parent_id: 0,
                  resource_code: 'TMS.ORDERS',
                  resource_name: '订单模块',
                  resource_type: 'module',
                  route_path: '',
                  component: '',
                  permission_code: '',
                  icon: 'mdi:package-variant-closed',
                  http_method: '',
                  api_path: '',
                  is_visible: false,
                  sort_order: 10,
                  status: 'ACTIVE',
                  remarks: '',
                  is_currently_effective: true,
                  invalid_reason: '',
                  can_maintain: false,
                  version: '63924670932147368',
                  created_at: '2026-09-01T00:00:00Z',
                  created_by: 'system',
                  updated_at: '2026-09-01T00:00:00Z',
                  updated_by: 'system',
                  is_direct: false,
                  is_inherited: false,
                  is_navigation_only: true,
                  source_roles: [],
                  children: [],
                },
                children: [
                  {
                    resource: {
                      id: 301,
                      app_id: 3,
                      parent_id: 201,
                      resource_code: 'TMS.ORDERS.MENU',
                      resource_name: '订单管理',
                      resource_type: 'menu',
                      route_path: '/tms/orders',
                      component: 'tms/orders/pages/OrderListPage',
                      permission_code: '',
                      icon: 'mdi:format-list-bulleted',
                      http_method: '',
                      api_path: '',
                      is_visible: true,
                      sort_order: 10,
                      status: 'ACTIVE',
                      remarks: '',
                      is_currently_effective: true,
                      invalid_reason: '',
                      can_maintain: false,
                      version: '63924670932147368',
                      created_at: '2026-09-01T00:00:00Z',
                      created_by: 'system',
                      updated_at: '2026-09-01T00:00:00Z',
                      updated_by: 'system',
                      is_direct: false,
                      is_inherited: false,
                      is_navigation_only: true,
                      source_roles: [],
                      children: [],
                    },
                    children: [
                      {
                        resource: {
                          id: 701,
                          app_id: 3,
                          parent_id: 301,
                          resource_code: 'TMS.ORDERS.QUERY',
                          resource_name: '订单查询',
                          resource_type: 'function',
                          route_path: '',
                          component: '',
                          permission_code: 'tms:orders:view',
                          icon: 'mdi:magnify',
                          http_method: 'POST',
                          api_path: '/tms/Order/Query',
                          is_visible: false,
                          sort_order: 10,
                          status: 'ACTIVE',
                          remarks: '',
                          is_currently_effective: true,
                          invalid_reason: '',
                          can_maintain: false,
                          version: '63924670932147368',
                          created_at: '2026-09-01T00:00:00Z',
                          created_by: 'system',
                          updated_at: '2026-09-01T00:00:00Z',
                          updated_by: 'system',
                          is_direct: true,
                          is_inherited: false,
                          is_navigation_only: false,
                          source_roles: [role],
                          children: [],
                        },
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        })
      },
    )

    await page.goto('/iam/members?view=permissions&tenantId=1&tenantUserId=1')
    await expect(page.getByRole('heading', { name: '用户角色与权限' })).toBeVisible()
    await expect(page).toHaveURL(/\/iam\/members\/permissions\?.*userId=1001/)
    await expect(page.locator('.detail-page-template__content > .el-alert--info')).toHaveCount(0)
    expect(userFunctionRequestCount).toBe(0)
    expect(catalogQueryCount).toBe(0)
    expect(memberFunctionRequests[0]).toEqual({ tenant_user_id: 1 })
    expect(roleAssignmentRequests[0]).toMatchObject({ tenant_id: 1, tenant_user_id: 1 })
    await expect(page.getByRole('button', { name: '分配角色' })).toBeEnabled()
    await page.getByRole('button', { name: '分配角色' }).click()
    await page.getByText('请选择一个或多个角色', { exact: true }).click()
    await page.getByRole('option', { name: /仓库操作员/ }).click()
    await page.getByRole('button', { name: '确认分配' }).click()
    await expect
      .poll(() => assignPayload)
      .toEqual({
        tenant_user_id: 1,
        member_version: '63924670932147368',
        role_ids: [502],
      })
    await page.getByRole('tab', { name: /Function/ }).click()
    const permissionPanel = page.locator('[data-function-permission-panel]')
    await expect(permissionPanel).toHaveAttribute('data-subject-type', 'member')
    await expect(permissionPanel).toHaveAttribute('data-can-edit', 'false')
    await expect(page.getByText('订单查询')).toBeVisible()
    await expect(permissionPanel.locator('.el-checkbox:not(.is-disabled)')).toHaveCount(0)
    await page.locator('.el-tree-node__content').filter({ hasText: '订单查询' }).click()
    await expect(
      page.locator('.permission-inspector').getByText('PLATFORM · 调度经理', { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: /数据权限/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /保存 Function 权限/ })).toHaveCount(0)
    await expect(permissionPanel.locator('.permission-legend')).toHaveCount(0)

    const originalViewport = page.viewportSize()
    await page.setViewportSize({ width: 1440, height: 560 })
    const appPage = page.locator('[data-app-page]')
    await expect
      .poll(() => appPage.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true)
    const compactHeightScroll = await appPage.evaluate((element) => {
      const overflowY = getComputedStyle(element).overflowY
      element.scrollTop = Math.min(64, element.scrollHeight - element.clientHeight)
      const scrollTop = element.scrollTop
      element.scrollTop = 0
      return { overflowY, scrollTop }
    })
    expect(compactHeightScroll.overflowY).toBe('auto')
    expect(compactHeightScroll.scrollTop).toBeGreaterThan(0)
    if (originalViewport) await page.setViewportSize(originalViewport)

    await page.locator('.member-permission-tenant .el-select').click()
    await page.getByRole('option', { name: '汉明巡天山东' }).click()
    await expect
      .poll(() => {
        const url = new URL(page.url())
        return {
          pathname: url.pathname,
          userId: url.searchParams.get('userId'),
          tenantId: url.searchParams.get('tenantId'),
        }
      })
      .toEqual({
        pathname: '/iam/members/permissions',
        userId: '1001',
        tenantId: '3',
      })
    await expect.poll(() => memberFunctionRequests.at(-1)).toEqual({ tenant_user_id: 3 })
    await expect
      .poll(() => roleAssignmentRequests.at(-1))
      .toMatchObject({
        tenant_id: 3,
        tenant_user_id: 3,
      })
    expect(userFunctionRequestCount).toBe(0)
    expect(catalogQueryCount).toBe(0)
  })

  test('queries users with all session tenants and submits an empty tenant selection', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const userRequests: Array<Record<string, unknown>> = []
    let tenantRequestCount = 0
    let organizationRequestCount = 0
    let positionRequestCount = 0

    page.on('request', (request) => {
      if (request.url().endsWith('/api/iam-admin/Membership/QueryUsers')) {
        const body = request.postDataJSON() as Record<string, unknown>
        if (body.page_size === 1000) userRequests.push(body)
      } else if (request.url().endsWith('/api/iam-admin/Tenant/Query')) {
        tenantRequestCount += 1
      } else if (request.url().endsWith('/api/iam-admin/Organization/Query')) {
        organizationRequestCount += 1
      } else if (request.url().endsWith('/api/iam-admin/Position/Query')) {
        positionRequestCount += 1
      }
    })

    await page.goto('/iam/members')
    await expect(page.getByRole('heading', { name: '用户与成员' })).toBeVisible()
    await expect.poll(() => userRequests[0]?.tenant_ids).toEqual([1, 3])
    await expect(page.getByLabel('查询对象')).toHaveCount(0)
    const tenantSelect = page.getByLabel('Tenant', { exact: true })
    await expect(tenantSelect).toBeVisible()
    await tenantSelect.press('ArrowDown')
    const platformOption = page.getByRole('option', { name: '华东运营中心 · PLATFORM' })
    const hmxtOption = page.getByRole('option', { name: '汉明巡天山东 · HMXTSD' })
    await expect(platformOption).toHaveAttribute('aria-selected', 'true')
    await expect(hmxtOption).toHaveAttribute('aria-selected', 'true')
    await platformOption.click()
    await hmxtOption.click()
    await page.getByRole('button', { name: '查询', exact: true }).click()
    await expect.poll(() => userRequests.at(-1)?.tenant_ids).toEqual([])

    expect(tenantRequestCount).toBe(0)
    expect(organizationRequestCount).toBe(0)
    expect(positionRequestCount).toBe(0)

    await page.getByRole('button', { name: '新增 Tenant 成员' }).click()
    const createDrawer = page.locator('.el-drawer').filter({ hasText: '新增 Tenant 成员' })
    await createDrawer.getByLabel('登录账号', { exact: true }).fill('relation.options.test')
    await createDrawer.getByLabel('姓名', { exact: true }).fill('归属选项测试')
    await createDrawer.getByRole('button', { name: '下一步' }).click()
    await expect.poll(() => organizationRequestCount).toBe(1)
    await expect.poll(() => positionRequestCount).toBe(1)
  })

  test('keeps user and member version tokens read-only and submits them unchanged', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let userUpdateBody: Record<string, unknown> | undefined
    let memberUpdateBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Membership/UpdateUser', async (route) => {
      userUpdateBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ ...userUpdateBody, status: 'ACTIVE', updated_at: '2026-09-11' }),
      })
    })
    await page.route('**/api/iam-admin/Membership/UpdateMember', async (route) => {
      memberUpdateBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ ...memberUpdateBody, status: 'ACTIVE', updated_at: '2026-09-11' }),
      })
    })

    await page.goto('/iam/members')
    await page.getByRole('button', { name: '编辑用户', exact: true }).click()
    const userDrawer = page.getByRole('dialog', { name: '编辑全局用户' })
    const userVersionInput = userDrawer.getByLabel('版本令牌')
    await expect(userVersionInput).toBeDisabled()
    await expect(userVersionInput).toHaveValue('63924670932147368')
    await userDrawer.getByLabel('姓名').fill('林嘉更新')
    await userDrawer.getByRole('button', { name: '保存全局资料' }).click()
    await expect.poll(() => userUpdateBody?.version).toBe('63924670932147368')

    await expect(page.getByRole('button', { name: '更多', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '编辑成员资料', exact: true }).click()
    const memberDrawer = page.getByRole('dialog', { name: '编辑 Tenant 成员' })
    const memberVersionInput = memberDrawer.getByLabel('版本令牌')
    await expect(memberVersionInput).toBeDisabled()
    await expect(memberVersionInput).toHaveValue('63924670932147368')
    await expect(memberDrawer.getByLabel('Tenant 显示名称')).toBeDisabled()
    await expect(memberDrawer.getByLabel('成员编号')).toBeDisabled()
    await memberDrawer.getByLabel('成员备注').fill('运营资料更新')
    await memberDrawer.getByRole('button', { name: '保存成员信息' }).click()
    await expect.poll(() => memberUpdateBody?.version).toBe('63924670932147368')
    expect(memberUpdateBody).not.toHaveProperty('tenant_user_code')
    expect(memberUpdateBody).not.toHaveProperty('display_name')
  })

  test('updates user Tenant assignments from a fresh snapshot with explicit restore semantics', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    const userVersion = '63924670932147368'
    const currentMemberVersion = '63924670932147369'
    const historicalMemberVersion = '63924670932147370'
    const deletedMemberVersion = '63924670932147371'
    let queryRequest: Record<string, unknown> | undefined
    let updateRequest: Record<string, unknown> | undefined

    const memberships = [
      {
        user_id: 1001,
        tenant_user_id: 1,
        tenant_id: 1,
        tenant_code: 'PLATFORM',
        tenant_name: '华东运营中心',
        tenant_user_code: 'HD0001',
        display_name: '林嘉',
        user_type: '正式员工',
        member_status: 'ACTIVE',
        is_tenant_admin: true,
        joined_at: '2026-01-01T00:00:00Z',
        left_at: null,
        is_currently_effective: true,
        membership_is_currently_effective: true,
        member_version: currentMemberVersion,
        tenant_status: 'ACTIVE',
        tenant_is_deleted: false,
        updated_at: '2026-09-11T00:00:00Z',
      },
      {
        user_id: 1001,
        tenant_user_id: 9,
        tenant_id: 9,
        tenant_code: 'LEGACY',
        tenant_name: '历史 Tenant',
        tenant_user_code: 'LEGACY0001',
        display_name: '林嘉',
        user_type: '正式员工',
        member_status: 'DISABLED',
        is_tenant_admin: false,
        joined_at: '2024-01-01T00:00:00Z',
        left_at: '2024-12-31T00:00:00Z',
        is_currently_effective: false,
        membership_is_currently_effective: false,
        member_version: deletedMemberVersion,
        tenant_status: '',
        tenant_is_deleted: true,
        updated_at: '2026-09-11T00:00:00Z',
      },
      {
        user_id: 1001,
        tenant_user_id: 3,
        tenant_id: 3,
        tenant_code: 'HMXTSD',
        tenant_name: '汉明巡天山东',
        tenant_user_code: 'SD0009',
        display_name: '林嘉',
        user_type: '正式员工',
        member_status: 'DISABLED',
        is_tenant_admin: false,
        joined_at: '2025-01-01T00:00:00Z',
        left_at: '2026-08-31T00:00:00Z',
        is_currently_effective: false,
        membership_is_currently_effective: false,
        member_version: historicalMemberVersion,
        tenant_status: 'ACTIVE',
        tenant_is_deleted: false,
        updated_at: '2026-09-11T00:00:00Z',
      },
    ]

    await page.route('**/api/iam-admin/Membership/QueryUserTenants', async (route) => {
      queryRequest = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ user_id: 1001, user_version: userVersion, memberships }),
      })
    })
    await page.route('**/api/iam-admin/Membership/UpdateUserTenants', async (route) => {
      updateRequest = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ user_id: 1001, user_version: userVersion, memberships }),
      })
    })
    await page.route('**/api/iam-admin/Tenant/Query', async (route) => {
      const request = route.request().postDataJSON() as { page_index: number; page_size: number }
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          total: 3,
          page_index: request.page_index,
          page_size: request.page_size,
          items: [
            {
              id: 1,
              tenant_code: 'PLATFORM',
              tenant_name: '华东运营中心',
              status: 'ACTIVE',
            },
            {
              id: 3,
              tenant_code: 'HMXTSD',
              tenant_name: '汉明巡天山东',
              status: 'ACTIVE',
            },
            {
              id: 7,
              tenant_code: 'LL-HUADONG',
              tenant_name: '陆链华东运营中心',
              status: 'active',
            },
          ],
        }),
      })
    })

    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await page.getByRole('tab', { name: '租户', exact: true }).click()
    await page.getByRole('button', { name: '编辑租户归属' }).click()
    const drawer = page.getByRole('dialog', { name: '编辑用户租户归属' })
    await expect(drawer).toBeVisible()
    await expect.poll(() => queryRequest).toEqual({ user_id: 1001 })
    await expect(drawer.getByText('历史关系不会因未选择而改变')).toBeVisible()
    await expect(drawer.getByText('历史 Tenant')).toBeVisible()
    await expect(drawer.getByText('Tenant 已删除')).toBeVisible()
    expect(updateRequest).toBeUndefined()

    const currentRow = drawer.locator('.el-table__row').filter({ hasText: '华东运营中心' })
    await currentRow.locator('.el-switch').click()

    const historicalRow = drawer.locator('.el-table__row').filter({ hasText: '汉明巡天山东' })
    await historicalRow.getByRole('button', { name: '恢复', exact: true }).click()
    const deletedRow = drawer.locator('.el-table__row').filter({ hasText: '历史 Tenant' })
    await deletedRow.getByRole('button', { name: '正式移除', exact: true }).click()
    await drawer.getByLabel('选择新增 Tenant').click()
    await page.getByRole('option', { name: '陆链华东运营中心 · LL-HUADONG' }).click()
    await drawer.getByRole('button', { name: '添加 Tenant' }).click()
    await drawer.getByRole('button', { name: '复核变更' }).click()
    const confirm = page.getByRole('dialog', { name: '确认更新用户租户归属' })
    await expect(confirm.getByText('恢复只恢复成员身份')).toBeVisible()
    await confirm.getByRole('button', { name: '确认更新租户归属' }).click()

    await expect.poll(() => updateRequest?.user_version).toBe(userVersion)
    expect(updateRequest).toMatchObject({
      user_id: 1001,
      original_memberships: [
        { tenant_user_id: 1, member_version: currentMemberVersion },
        { tenant_user_id: 9, member_version: deletedMemberVersion },
        { tenant_user_id: 3, member_version: historicalMemberVersion },
      ],
      tenants: [
        { tenant_id: 1, is_tenant_admin: false, restore: false },
        { tenant_id: 3, is_tenant_admin: false, restore: true },
        { tenant_id: 7, is_tenant_admin: false, restore: false },
      ],
      remove_tenant_user_ids: [9],
    })
    expect(typeof updateRequest?.request_id).toBe('string')
  })

  test('blocks blind mutation retry after a failed user Tenant assignment update', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let queryCount = 0
    let updateCount = 0
    const membership = {
      user_id: 1001,
      tenant_user_id: 1,
      tenant_id: 1,
      tenant_code: 'PLATFORM',
      tenant_name: '华东运营中心',
      tenant_user_code: 'HD0001',
      display_name: '林嘉',
      user_type: '正式员工',
      member_status: 'ACTIVE',
      is_tenant_admin: true,
      joined_at: '2026-01-01T00:00:00Z',
      left_at: null,
      is_currently_effective: true,
      membership_is_currently_effective: true,
      member_version: '63924670932147369',
      tenant_status: 'ACTIVE',
      tenant_is_deleted: false,
      updated_at: '2026-09-11T00:00:00Z',
    }

    await page.route('**/api/iam-admin/Membership/QueryUserTenants', async (route) => {
      queryCount += 1
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          user_id: 1001,
          user_version: '63924670932147368',
          memberships: [membership],
        }),
      })
    })
    await page.route('**/api/iam-admin/Membership/UpdateUserTenants', async (route) => {
      updateCount += 1
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'conflict',
          code: 'IAM_CONCURRENCY_CONFLICT',
          message: '用户租户关系已发生变化',
        }),
      })
    })

    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await page.getByRole('tab', { name: '租户', exact: true }).click()
    await page.getByRole('button', { name: '编辑租户归属' }).click()
    const drawer = page.getByRole('dialog', { name: '编辑用户租户归属' })
    await expect(drawer.locator('.el-loading-mask')).toHaveCount(0)
    const currentRow = drawer.locator('.el-table__row').filter({ hasText: '华东运营中心' })
    await currentRow.locator('.el-switch').click()
    await drawer.getByRole('button', { name: '复核变更' }).click()
    const confirm = page.getByRole('dialog', { name: '确认更新用户租户归属' })
    await confirm.getByRole('button', { name: '确认更新租户归属' }).click()

    await expect(confirm.getByText(/已保留当前变更/)).toBeVisible()
    await expect(confirm.getByRole('button', { name: '确认更新租户归属' })).toHaveCount(0)
    await expect(confirm.getByRole('button', { name: '重新加载最新快照' })).toBeVisible()
    expect(updateCount).toBe(1)

    await confirm.getByRole('button', { name: '重新加载最新快照' }).click()
    await expect.poll(() => queryCount).toBe(2)
    await expect(confirm).toBeHidden()
    expect(updateCount).toBe(1)
  })

  test('keeps user Tenant assignment editing hidden without the SA permission', async ({
    page,
  }) => {
    await useAuthenticatedSession(page, {
      excludedFunctionPermissions: ['iam:members:update-user-tenants'],
    })

    await page.goto('/iam/members')
    await page.getByRole('button', { name: '详情', exact: true }).first().click()
    await page.getByRole('tab', { name: '租户', exact: true }).click()
    await expect(page.getByRole('button', { name: '编辑租户归属' })).toBeHidden()
  })

  test('loads the approved group view and submits Group/Update with bearer auth', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    let updateBody: Record<string, unknown> | undefined
    let authorization = ''
    await page.route('**/api/iam-admin/Group/Update', async (route) => {
      updateBody = route.request().postDataJSON() as Record<string, unknown>
      authorization = route.request().headers().authorization ?? ''
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          ...updateBody,
          platform_name: 'SS Express',
          updated_at: '2026-09-06T00:00:00Z',
        }),
      })
    })

    await page.goto('/iam/group')
    await expect(page.getByRole('heading', { name: '集团信息' })).toBeVisible()
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer')
    await drawer
      .locator('.el-form-item')
      .filter({ hasText: '集团名称' })
      .locator('input')
      .fill('陆链集团')
    await drawer.getByRole('button', { name: '保存集团信息' }).click()

    await expect.poll(() => updateBody?.group_name).toBe('陆链集团')
    expect(updateBody).not.toHaveProperty('group_code')
    expect(authorization).toBe('Bearer visual-test-access-token')
  })

  test('keeps long group information reachable inside the shared page scroller', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.unroute('**/api/iam-admin/Group/Info')
    await page.route('**/api/iam-admin/Group/Info', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          id: 1,
          group_code: 'SS-EXPRESS',
          group_name: '陆链物流集团',
          full_name: '山东陆链智慧物流集团有限公司',
          short_name: '陆链物流',
          logo_url: '',
          platform_name: 'SS Express',
          description: '覆盖运输、车辆、组织与权限的一体化物流平台说明。'.repeat(80),
          contact_name: '林嘉',
          contact_phone: '13800000000',
          contact_email: 'linjia@example.com',
          website: 'www.ss-express.cn',
          address: '山东省济南市高新区陆链智慧物流园区'.repeat(30),
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          remarks: '用于验证长内容仍然可以完整阅读。'.repeat(50),
          version: '1',
          updated_at: '2026-09-04T00:00:00Z',
        }),
      }),
    )

    await page.goto('/iam/group')
    const appPage = page.locator('[data-app-page]')
    const detailTemplate = page.locator('.detail-page-template')
    const lastField = page.getByText('更新时间', { exact: true })

    await expect(detailTemplate).toHaveAttribute('data-scroll-mode', 'page')
    const beforeScroll = await appPage.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }))
    expect(beforeScroll.overflowY).toBe('auto')
    expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight)

    await appPage.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect.poll(() => appPage.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await expect(lastField).toBeInViewport()
  })

  test('selects a tenant, replaces the token and enters the framework page', async ({ page }) => {
    await mockShellContextApis(page)
    await page.addInitScript(() => {
      window.sessionStorage.setItem('access_token', 'tenant-selection-token')
      window.sessionStorage.setItem('login_state', 'TENANT_SELECTION_REQUIRED')
      window.sessionStorage.setItem('login_account', 'hmxt')
      window.sessionStorage.setItem('login_session_id', '2')
      window.sessionStorage.setItem('login_session_version', '63924670932147368')
      window.sessionStorage.setItem(
        'login_available_tenants',
        JSON.stringify([
          {
            tenantId: 3,
            tenantUserId: 3,
            tenantCode: 'HMXTSD',
            tenantName: '汉明巡天山东',
            tenantType: 'enterprise',
            logoUrl: '',
            timezone: 'Asia/Shanghai',
            isDefault: false,
          },
        ]),
      )
    })
    let switchBody: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Auth/SwitchTenant', async (route) => {
      switchBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          token: 'authenticated-token',
          login_state: 'AUTHENTICATED',
          session_id: 2,
          session_version: '63924670932147369',
          expires_at: '2026-09-07T00:00:00Z',
          user_version: '63924670932147368',
          current_tenant: {
            tenant_id: 3,
            tenant_user_id: 3,
            tenant_code: 'HMXTSD',
            tenant_name: '汉明巡天山东',
            tenant_type: 'enterprise',
            logo_url: '',
            timezone: 'Asia/Shanghai',
            is_default: false,
          },
          available_tenants: [],
        }),
      })
    })

    await page.goto('/iam/select-tenant')
    await page.getByRole('radio', { name: /汉明巡天山东/ }).click()
    await page.getByRole('button', { name: '进入 Tenant' }).click()

    await expect(page).toHaveURL(/\/platform\/dashboard$/u)
    expect(switchBody).toMatchObject({
      tenant_id: 3,
      session_version: '63924670932147368',
    })
    const storedToken = await page.evaluate(() => window.sessionStorage.getItem('access_token'))
    expect(storedToken).toBe('authenticated-token')
    const storedVersion = await page.evaluate(() =>
      window.sessionStorage.getItem('login_session_version'),
    )
    expect(storedVersion).toBe('63924670932147369')
  })
})
