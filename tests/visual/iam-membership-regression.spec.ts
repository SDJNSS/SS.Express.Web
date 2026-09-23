import { expect, test, type Locator, type Page } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

function apiSuccess(data: unknown): string {
  return JSON.stringify({ status: 'success', code: 1, message: '', data })
}

function tenantMembership(
  tenantId: number,
  tenantUserId: number,
  tenantCode: string,
  tenantName: string,
  options: {
    userId?: number
    effective?: boolean
    deleted?: boolean
    displayName?: string
  } = {},
) {
  const effective = options.effective ?? true
  return {
    user_id: options.userId ?? 1001,
    tenant_user_id: tenantUserId,
    tenant_id: tenantId,
    tenant_code: tenantCode,
    tenant_name: tenantName,
    tenant_user_code: `${tenantCode}-0001`,
    display_name: options.displayName ?? `${tenantName}昵称`,
    user_type: '正式员工',
    member_status: effective ? 'ACTIVE' : 'DISABLED',
    is_tenant_admin: tenantId === 1,
    joined_at: '2026-01-01T00:00:00Z',
    left_at: effective ? '' : '2026-06-30T00:00:00Z',
    is_currently_effective: effective,
    membership_is_currently_effective: effective,
    member_version: `member-version-${tenantId}`,
    tenant_status: options.deleted ? '' : 'ACTIVE',
    tenant_is_deleted: options.deleted ?? false,
    updated_at: '2026-09-17T00:00:00Z',
  }
}

const activeMemberships = [
  tenantMembership(1, 101, 'PLATFORM', '华东运营中心', { displayName: '华东昵称' }),
  tenantMembership(3, 103, 'HMXTSD', '汉明巡天山东', { displayName: '山东昵称' }),
  tenantMembership(7, 107, 'LL-HUADONG', '陆链华东新租户', { displayName: '新租户昵称' }),
]

const ignoredMemberships = [
  tenantMembership(9, 109, 'LEGACY', '历史租户', { effective: false }),
  tenantMembership(11, 111, 'FOREIGN', '其他用户租户', { userId: 2002 }),
  tenantMembership(13, 113, 'DELETED', '已删除租户', { deleted: true }),
]

function queryUsersPage(pageSize: number, includeDiscoveryNoise = false) {
  return {
    total: 1,
    page_index: 1,
    page_size: pageSize,
    items: [
      {
        user_id: 1001,
        tenant_user_id: 101,
        user_status: 'ACTIVE',
        member_status: 'ACTIVE',
        user_version: 'user-version-1',
        member_version: 'member-version-1',
        tenant_id: 1,
        tenant_code: 'PLATFORM',
        tenant_user_code: 'HD0001',
        display_name: '华东昵称',
        is_tenant_admin: true,
        joined_at: '2026-01-01T00:00:00Z',
        left_at: '',
        is_member_currently_effective: true,
        user: {
          id: 1001,
          user_name: '林嘉',
          real_name: '林嘉实名',
          nick_name: '嘉嘉',
          phone: '13800000000',
          email: 'linjia@example.com',
          avatar_url: '',
          user_type: '平台用户',
          status: 'ACTIVE',
          remarks: '生产回归用户',
          version: 'user-version-1',
          updated_at: '2026-09-17T00:00:00Z',
        },
        organizations: [
          {
            id: 501,
            tenant_user_id: 101,
            org_id: 10,
            org_code: 'EAST',
            org_name: '华东运营中心',
            is_primary: true,
            effective_start: '2026-01-01T00:00:00Z',
            effective_end: '',
            is_currently_effective: true,
            status: 'ACTIVE',
            remarks: '',
            version: '1',
            updated_at: '2026-09-17T00:00:00Z',
          },
        ],
        positions: [
          {
            id: 601,
            tenant_user_id: 101,
            position_id: 20,
            position_code: 'OPS_MANAGER',
            position_name: '运营经理',
            is_primary: true,
            effective_start: '2026-01-01T00:00:00Z',
            effective_end: '',
            is_currently_effective: true,
            status: 'ACTIVE',
            remarks: '',
            version: '1',
            updated_at: '2026-09-17T00:00:00Z',
          },
        ],
        memberships: [
          ...activeMemberships,
          ...ignoredMemberships.filter(
            (membership) => includeDiscoveryNoise || membership.user_id === 1001,
          ),
        ],
      },
    ],
  }
}

interface MembershipMocks {
  discoveryRequests: Array<Record<string, unknown>>
  listRequests: Array<Record<string, unknown>>
  organizationRequests: Array<Record<string, unknown>>
  positionRequests: Array<Record<string, unknown>>
}

async function mockMembershipProduction(page: Page): Promise<MembershipMocks> {
  await useAuthenticatedSession(page)
  const result: MembershipMocks = {
    discoveryRequests: [],
    listRequests: [],
    organizationRequests: [],
    positionRequests: [],
  }

  await page.route('**/api/iam-admin/Membership/QueryUsers', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    const isTenantDiscovery = request.page_size === 1 && request.user_name === '林嘉'
    if (isTenantDiscovery) result.discoveryRequests.push(request)
    else result.listRequests.push(request)
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess(queryUsersPage(Number(request.page_size) || 1000, isTenantDiscovery)),
    })
  })

  await page.route('**/api/iam-admin/Organization/Query', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    result.organizationRequests.push(request)
    const tenantId = Number(request.tenant_id)
    const item = {
      id: tenantId === 3 ? 30 : 10,
      tenant_id: tenantId,
      tenant_code: tenantId === 3 ? 'HMXTSD' : 'PLATFORM',
      parent_id: 0,
      org_code: tenantId === 3 ? 'SD-HUB' : 'EAST',
      org_name: tenantId === 3 ? '山东分拨中心' : '华东运营中心',
      org_type: '运营中心',
      leader_tenant_user_id: 1001,
      leader_display_name: '林嘉实名',
      path: tenantId === 3 ? '/SD-HUB' : '/EAST',
      level: 1,
      sort_order: 1,
      status: 'ACTIVE',
      remarks: '',
      active_member_count: 1,
      version: '1',
      updated_at: '2026-09-17T00:00:00Z',
      children: [],
    }
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({ total: 1, page_index: 1, page_size: 1000, items: [item] }),
    })
  })

  await page.route('**/api/iam-admin/Position/Query', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    result.positionRequests.push(request)
    const tenantId = Number(request.tenant_id)
    const item = {
      id: tenantId === 3 ? 40 : 20,
      tenant_id: tenantId,
      tenant_code: tenantId === 3 ? 'HMXTSD' : 'PLATFORM',
      position_code: tenantId === 3 ? 'SD-DISPATCHER' : 'OPS_MANAGER',
      position_name: tenantId === 3 ? '山东调度员' : '运营经理',
      position_type: '运营岗位',
      sort_order: 1,
      status: 'ACTIVE',
      remarks: '',
      active_member_count: 1,
      version: '1',
      updated_at: '2026-09-17T00:00:00Z',
    }
    await route.fulfill({
      contentType: 'application/json',
      body: apiSuccess({ total: 1, page_index: 1, page_size: 1000, items: [item] }),
    })
  })

  return result
}

function formItem(drawer: Locator, label: string): Locator {
  return drawer
    .getByLabel(label, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " el-form-item ")][1]',
    )
}

async function chooseSelect(
  page: Page,
  drawer: Locator,
  label: string,
  option: string,
  multiple = false,
): Promise<void> {
  await formItem(drawer, label).locator('.el-select__wrapper').click()
  await page
    .locator('[role="option"][aria-selected="false"]:visible')
    .filter({ hasText: option })
    .last()
    .click()
  if (multiple) await page.keyboard.press('Escape')
}

test.describe('IAM membership production regression', () => {
  test('uses current memberships and keeps list, detail and edit semantics explicit', async ({
    page,
  }, testInfo) => {
    const requests = await mockMembershipProduction(page)

    await page.goto('/iam/members')
    await expect(page.getByRole('heading', { name: '用户与成员' })).toBeVisible()
    await expect.poll(() => requests.discoveryRequests.length).toBeGreaterThan(0)
    expect(requests.discoveryRequests[0]).toMatchObject({
      tenant_ids: [1],
      user_name: '林嘉',
      page_index: 1,
      page_size: 1,
    })
    await expect
      .poll(() =>
        requests.listRequests.some((request) => {
          const ids = request.tenant_ids as number[] | undefined
          return ids?.join(',') === '1,3,7'
        }),
      )
      .toBe(true)

    const headers = page.locator('.el-table__header-wrapper').first().getByRole('columnheader')
    await expect(headers.nth(0)).toContainText('用户名称')
    await expect(headers.nth(1)).toContainText('Tenant')
    await expect(headers.nth(2)).toContainText('成员编号')
    await expect(headers.nth(3)).toContainText('昵称')
    await expect(page.getByRole('columnheader', { name: '组织/岗位', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Tenant 显示名称' })).toHaveCount(0)

    const tenantSelect = page.getByLabel('Tenant', { exact: true })
    const tenantSelectWrapper = formItem(page.locator('body'), 'Tenant').locator(
      '.el-select__wrapper',
    )
    await expect(tenantSelectWrapper).toContainText(/\+\s*2/)
    const tenantSelectGeometry = await tenantSelectWrapper.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      controlHeight: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--size-control'),
      ),
    }))
    expect(tenantSelectGeometry.height).toBeLessThanOrEqual(tenantSelectGeometry.controlHeight + 1)
    await tenantSelect.press('ArrowDown')
    for (const name of [
      '华东运营中心 · PLATFORM',
      '汉明巡天山东 · HMXTSD',
      '陆链华东新租户 · LL-HUADONG',
    ]) {
      await expect(page.getByRole('option', { name, exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    }
    await expect(
      page.getByRole('option', { name: /历史租户|其他用户租户|已删除租户/ }),
    ).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(tenantSelect).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('membership-list.png'),
      fullPage: true,
      animations: 'disabled',
    })

    const row = page.locator('.el-table__body-wrapper .el-table__row').first()
    await expect(row).toContainText('林嘉实名')
    await expect(row).toContainText('华东昵称')
    await expect(row.getByRole('button', { name: '组织归属' })).toHaveCount(0)
    await expect(row.getByRole('button', { name: '岗位归属' })).toHaveCount(0)
    await row.locator('td').first().click()
    await expect(page.getByRole('dialog', { name: /身份详情/ })).toHaveCount(0)

    await row.getByRole('button', { name: '详情', exact: true }).click()
    const detail = page.getByRole('dialog', { name: /身份详情/ })
    await expect(detail).toBeVisible()
    await expect(detail.getByRole('tab', { name: '跨 Tenant 成员关系' })).toHaveCount(0)
    await detail.getByRole('tab', { name: '租户', exact: true }).click()
    const tenantPanel = detail.locator('.el-tab-pane:visible')
    await expect(
      tenantPanel.getByRole('columnheader', { name: '显示名称', exact: true }),
    ).toHaveCount(0)
    const detailWidth = await detail
      .locator('.membership-detail')
      .evaluate((element) => element.getBoundingClientRect().width)
    const drawerBodyWidth = await detail
      .locator('.el-drawer__body')
      .evaluate((element) => element.getBoundingClientRect().width)
    expect(detailWidth).toBeLessThanOrEqual(drawerBodyWidth + 1)
    const assignmentHeader = tenantPanel.locator('.relation-section__header')
    await expect(assignmentHeader.locator(':scope > button').first()).toHaveText('编辑租户归属')
    await page.screenshot({
      path: testInfo.outputPath('membership-tenant-tab.png'),
      animations: 'disabled',
    })
    await detail.locator('.el-drawer__close-btn').click()

    await page.getByRole('button', { name: '编辑用户', exact: true }).first().click()
    const userDrawer = page.getByRole('dialog', { name: '编辑全局用户' })
    await expect(userDrawer.getByLabel('用户 ID', { exact: true })).toBeDisabled()
    await userDrawer.getByRole('button', { name: '取消', exact: true }).click()

    await page.getByRole('button', { name: '编辑成员资料', exact: true }).first().click()
    const memberDrawer = page.getByRole('dialog', { name: '编辑 Tenant 成员' })
    for (const label of ['成员 ID', '用户 ID', 'Tenant ID']) {
      await expect(memberDrawer.getByLabel(label, { exact: true })).toBeDisabled()
    }
  })

  test('preserves the create draft across back and failure and submits the reviewed payload', async ({
    page,
  }, testInfo) => {
    test.slow()
    const requests = await mockMembershipProduction(page)
    const createRequests: Array<Record<string, unknown>> = []
    let uploads = 0
    let accessRequests = 0
    await page.route('**/api/dms/File/Upload', async (route) => {
      uploads += 1
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({
          file_id: 'avatar-draft',
          upload_id: 'draft-upload',
          status: 'AVAILABLE',
          original_name: 'avatar.png',
          file_category: 'IMAGE',
          content_type: 'image/png',
          file_size_bytes: 68,
          media_duration_ms: 0,
          idempotent: false,
        }),
      })
    })
    await page.route('**/api/dms/File/GetAccessUrl', async (route) => {
      accessRequests += 1
      await route.abort()
    })
    await page.route('**/api/iam-admin/Membership/CreateMember', async (route) => {
      const request = route.request().postDataJSON() as Record<string, unknown>
      createRequests.push(request)
      if (createRequests.length === 1) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'conflict',
            code: 'IAM_ACCOUNT_EXISTS',
            message: '账号已存在，请更换登录账号',
          }),
        })
        return
      }
      await route.fulfill({
        contentType: 'application/json',
        body: apiSuccess({ id: 808, version: 'member-version-808' }),
      })
    })

    await page.goto('/iam/members')
    await expect.poll(() => requests.listRequests.length).toBeGreaterThan(0)
    await page.getByRole('button', { name: '新增 Tenant 成员' }).click()
    const drawer = page.getByRole('dialog', { name: '新增 Tenant 成员' })

    for (const label of ['登录账号', '姓名', '昵称', '手机号', '邮箱']) {
      await expect(drawer.getByLabel(label, { exact: true })).toHaveValue('')
    }
    await expect(formItem(drawer, '用户类型').locator('.el-select__wrapper')).toContainText(
      '平台用户',
    )
    await drawer.getByText('关联已有用户', { exact: true }).click()
    await expect(drawer.getByRole('button', { name: '精确查找并确认' })).toHaveCount(0)
    await expect(drawer.getByText('确认用户', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('完整登录账号', { exact: true })).toHaveValue('')
    await drawer.getByText('创建新用户', { exact: true }).click()

    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(drawer.getByText('请输入登录账号', { exact: true })).toBeVisible()
    await expect(drawer.getByText('请输入姓名', { exact: true })).toBeVisible()

    await chooseSelect(page, drawer, '目标 Tenant', '汉明巡天山东 · HMXTSD')
    await drawer.getByLabel('登录账号', { exact: true }).fill('route.operator')
    await drawer.getByLabel('姓名', { exact: true }).fill('张路')
    await drawer.getByLabel('昵称', { exact: true }).fill('小路')
    await drawer.getByLabel('手机号', { exact: true }).fill('13900000001')
    await drawer.getByLabel('邮箱', { exact: true }).fill('route.operator@example.com')
    await drawer.locator('input[type=file]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=',
        'base64',
      ),
    })
    await expect(drawer.getByText('文件 ID：avatar-draft')).toBeVisible()
    const avatar = drawer.locator('.el-upload-list__item-thumbnail')
    const avatarUrl = await avatar.getAttribute('src')
    expect(avatarUrl).toMatch(/^blob:/)
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()

    await expect
      .poll(() => requests.organizationRequests.some((item) => item.tenant_id === 3))
      .toBe(true)
    await expect
      .poll(() => requests.positionRequests.some((item) => item.tenant_id === 3))
      .toBe(true)
    await expect(drawer.getByLabel('成员编号', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('Tenant 显示名称', { exact: true })).toHaveCount(0)
    await expect(formItem(drawer, '成员用户类型').locator('.el-select__wrapper')).toContainText(
      '正式员工',
    )
    await expect(drawer.getByLabel('有效开始时间（Asia/Shanghai）', { exact: true })).toHaveValue(
      '',
    )

    await drawer
      .getByLabel('有效开始时间（Asia/Shanghai）', { exact: true })
      .fill('2026-10-08 09:30:00')
    await drawer.getByLabel('成员备注', { exact: true }).fill('夜班线路')
    await chooseSelect(page, drawer, '初始组织（可多选）', '山东分拨中心 · SD-HUB', true)
    await chooseSelect(page, drawer, '主要组织', '山东分拨中心 · SD-HUB')
    await chooseSelect(page, drawer, '初始岗位（可多选）', '山东调度员 · SD-DISPATCHER', true)
    await chooseSelect(page, drawer, '主要岗位', '山东调度员 · SD-DISPATCHER')

    await drawer.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(drawer.getByLabel('登录账号', { exact: true })).toHaveValue('route.operator')
    await expect(drawer.getByLabel('姓名', { exact: true })).toHaveValue('张路')
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', avatarUrl!)
    await expect
      .poll(() => avatar.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
    await expect(formItem(drawer, '目标 Tenant').locator('.el-select__wrapper')).toContainText(
      '汉明巡天山东',
    )

    await chooseSelect(page, drawer, '目标 Tenant', '华东运营中心 · PLATFORM')
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(drawer.getByLabel('成员编号', { exact: true })).toHaveCount(0)
    await expect(drawer.getByLabel('有效开始时间（Asia/Shanghai）', { exact: true })).toHaveValue(
      '2026-10-08 09:30:00',
    )
    await expect(
      formItem(drawer, '初始组织（可多选）').locator('.el-select__wrapper'),
    ).not.toContainText('山东分拨中心')
    await expect(
      formItem(drawer, '初始岗位（可多选）').locator('.el-select__wrapper'),
    ).not.toContainText('山东调度员')

    await expect
      .poll(() => requests.organizationRequests.some((item) => item.tenant_id === 1))
      .toBe(true)
    await expect
      .poll(() => requests.positionRequests.some((item) => item.tenant_id === 1))
      .toBe(true)
    await chooseSelect(page, drawer, '初始组织（可多选）', '华东运营中心 · EAST', true)
    await chooseSelect(page, drawer, '主要组织', '华东运营中心 · EAST')
    await chooseSelect(page, drawer, '初始岗位（可多选）', '运营经理 · OPS_MANAGER', true)
    await chooseSelect(page, drawer, '主要岗位', '运营经理 · OPS_MANAGER')
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()

    const review = drawer.locator('.member-review')
    for (const value of [
      '华东运营中心 · PLATFORM',
      'route.operator',
      '张路 / 小路',
      '13900000001 / route.operator@example.com',
      '由服务端按租户编码与成员 ID / 登录账号自动生成',
      '2026-10-08 09:30:00 ～ 长期有效',
      '华东运营中心 · EAST（主要）',
      '运营经理 · OPS_MANAGER（主要）',
    ]) {
      await expect(review).toContainText(value)
    }
    await page.screenshot({
      path: testInfo.outputPath('membership-create-review.png'),
      animations: 'disabled',
    })
    const finalReviewValue = review.getByText('运营经理 · OPS_MANAGER（主要）', { exact: true })
    await finalReviewValue.scrollIntoViewIfNeeded()
    await expect(finalReviewValue).toBeVisible()

    await drawer.getByRole('button', { name: '创建成员', exact: true }).click()
    await expect(drawer.getByText('账号已存在，请更换登录账号')).toBeVisible()
    await expect(drawer).toBeVisible()
    await expect(review).toContainText('route.operator')

    await drawer.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(drawer.getByLabel('成员编号', { exact: true })).toHaveCount(0)
    await expect(
      formItem(drawer, '初始组织（可多选）').locator('.el-select__wrapper'),
    ).toContainText('华东运营中心')
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await drawer.getByRole('button', { name: '创建成员', exact: true }).click()
    await expect(drawer).toBeHidden()

    expect(createRequests).toHaveLength(2)
    expect(createRequests[0]).toEqual(createRequests[1])
    expect(createRequests[1]).toMatchObject({
      tenant_id: 1,
      use_existing_user: false,
      new_user: {
        user_name: 'route.operator',
        real_name: '张路',
        nick_name: '小路',
        phone: '13900000001',
        email: 'route.operator@example.com',
        avatar_url: '',
        avatar_file_id: 'avatar-draft',
        user_type: '平台用户',
      },
      user_type: '正式员工',
      effective_start: '2026-10-08 09:30:00',
      is_tenant_admin: false,
      remarks: '夜班线路',
      organizations: [{ org_id: 10, is_primary: true }],
      positions: [{ position_id: 20, is_primary: true }],
    })
    expect(JSON.stringify(createRequests[1])).not.toContain('password')
    expect(createRequests[1]).not.toHaveProperty('tenant_user_code')
    expect(createRequests[1]).not.toHaveProperty('display_name')
    expect(uploads).toBe(1)
    expect(accessRequests).toBe(0)
  })
})
