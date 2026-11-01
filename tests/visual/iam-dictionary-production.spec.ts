import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const token = '63928800000000001'
const dictionary = {
  id: 101,
  dict_type_code: 'TRANSPORT_MODE',
  dict_type_name: '运输方式',
  description: '平台共享资料',
  status: 'active',
  version: token,
  created_at: null,
  updated_at: null,
  created_by: '',
  updated_by: '',
}
const item = {
  id: 201,
  dict_type_id: 101,
  dict_type_code: 'TRANSPORT_MODE',
  item_code: 'road',
  item_name: '公路运输',
  description: '',
  sort_no: 0,
  item_color: '',
  status: 'active',
  is_available: true,
  ext_data: false,
  version: '0',
  created_at: null,
  updated_at: null,
  created_by: '',
  updated_by: '',
}
const actions = [
  'CREATE',
  'UPDATE',
  'ENABLE',
  'DISABLE',
  'CREATE_ITEM',
  'UPDATE_ITEM',
  'ENABLE_ITEM',
  'DISABLE_ITEM',
]
const success = (data: unknown) =>
  JSON.stringify({ data, is_success: true, code: 1, status: 'success', message: '' })

async function setup(
  page: Page,
  options: {
    denied?: boolean
    readOnly?: boolean
    unknownWrite?: boolean
    rejectWriteAsNonSa?: boolean
    uppercaseStatuses?: boolean
  } = {},
) {
  await useAuthenticatedSession(page)
  const calls: Array<{ action: string; body: Record<string, unknown> }> = []
  const dict = { ...dictionary },
    value = { ...item }
  await page.route('**/api/iam-admin/CurrentPermissionResource/CurrentPageResources', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        page_resource_code: 'IAM.DICTIONARIES',
        can_access: !options.denied,
        button_resource_codes: options.readOnly
          ? []
          : actions.map((action) => `IAM.DICTIONARIES.${action}`),
        button_page_resource_codes: [],
        read_function_resource_codes: [],
        authorization_version: '1',
      }),
    }),
  )
  await page.route('**/api/iam-admin/Auth/CurrentProfile', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        user_id: 1001,
        real_name: '测试管理员',
        user_name: 'admin',
        nick_name: '',
        display_name: '测试管理员',
        avatar_url: '',
        avatar_file_id: '',
        tenant_id: 1,
        tenant_code: 'PLATFORM',
        tenant_name: '当前租户',
        tenant_user_id: 1001,
        tenant_user_code: 'OPS001',
        organization_id: 10,
        organization_name: '测试组织',
        position_id: 20,
        position_name: '测试岗位',
        is_tenant_admin: true,
      }),
    }),
  )
  await page.route('**/api/iam-admin/Dictionary/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1)!
    const body = route.request().postDataJSON() as Record<string, unknown>
    calls.push({ action, body })
    if (options.rejectWriteAsNonSa && action === 'Disable') {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          is_success: false,
          code: 403,
          reason_code: 'AUTH_SA_REQUIRED',
          message: '仅SA（集团超级管理员）才可操作',
        }),
      })
      return
    }
    if (options.unknownWrite && action === 'Disable') {
      await route.abort('failed')
      return
    }
    let data: unknown
    if (action === 'Query')
      data = { items: [dict], total: 40, page_index: body.page_index, page_size: body.page_size }
    else if (action === 'QueryItems')
      data = {
        dictionary: dict,
        items: [value],
        total: 1,
        page_index: body.page_index,
        page_size: body.page_size,
      }
    else if (action === 'Disable' || action === 'Enable') {
      dict.status = action === 'Disable' ? 'disabled' : 'active'
      dict.version = '63928800000000002'
      data = dict
    } else if (action === 'DisableItem' || action === 'EnableItem') {
      value.status = action === 'DisableItem' ? 'disabled' : 'active'
      value.version = '63928800000000003'
      value.is_available = value.status === 'active' && dict.status === 'active'
      data = value
    } else if (action === 'Update') {
      Object.assign(dict, body, { version: '63928800000000004' })
      data = dict
    } else if (action === 'UpdateItem') {
      Object.assign(value, body, { version: '63928800000000005' })
      data = value
    } else if (action === 'Create')
      data = {
        ...dict,
        id: 102,
        dict_type_code: body.dict_type_code,
        dict_type_name: body.dict_type_name,
        items: [],
      }
    else data = { ...value, id: 202, ...body, version: '63928800000000006' }
    if (options.uppercaseStatuses) {
      const upper = (row: Record<string, unknown>): Record<string, unknown> => ({
        ...row,
        ...(typeof row.status === 'string' ? { status: row.status.toUpperCase() } : {}),
      })
      const wire = upper(data as Record<string, unknown>)
      if (Array.isArray(wire.items)) wire.items = wire.items.map(upper)
      if (wire.dictionary && typeof wire.dictionary === 'object')
        wire.dictionary = upper(wire.dictionary as Record<string, unknown>)
      data = wire
    }
    await route.fulfill({ contentType: 'application/json', body: success(data) })
  })
  return calls
}

test('real binding restores filters, sends one query per action and supports browser back', async ({
  page,
}) => {
  const calls = await setup(page)
  await page.goto('/iam/dictionaries?dictTypeCode=TRANSPORT_MODE&keyword=运输&pageSize=50')
  await expect(page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true })).toBeVisible()
  expect(calls.filter((c) => c.action === 'Query')).toHaveLength(1)
  expect(calls[0]?.body).toEqual({
    page_index: 1,
    page_size: 50,
    keyword: '运输',
    dict_type_code: 'TRANSPORT_MODE',
    status: null,
  })
  await page.getByLabel('字典名称 / 关键词', { exact: true }).fill('  新查询  ')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect.poll(() => calls.filter((c) => c.action === 'Query').length).toBe(2)
  await expect(page).toHaveURL(/keyword=%E6%96%B0%E6%9F%A5%E8%AF%A2/)
  expect(calls.filter((c) => c.action === 'Query')[1]?.body.keyword).toBe('新查询')
  await page.goto('/iam/dictionaries?keyword=返回测试&pageIndex=2')
  await expect(page.getByLabel('字典名称 / 关键词', { exact: true })).toHaveValue('返回测试')
  await page.goBack()
  await expect(page.getByLabel('字典名称 / 关键词', { exact: true })).toHaveValue('新查询')
  expect(calls.every((c) => !('tenant_id' in c.body) && !('tenant_ids' in c.body))).toBe(true)
})

test('status writes use exact endpoints and original string versions, never Delete', async ({
  page,
}) => {
  const calls = await setup(page, { uppercaseStatuses: true })
  await page.goto('/iam/dictionaries')
  const row = page.locator('.el-table__row').filter({ hasText: 'TRANSPORT_MODE' })
  await row.getByRole('button', { name: '停用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '停用字典？', exact: true })
    .getByRole('button', { name: '确认停用', exact: true })
    .click()
  await expect(row.getByRole('button', { name: '启用', exact: true })).toBeVisible()
  expect(calls.find((c) => c.action === 'Disable')?.body).toEqual({ id: 101, version: token })
  await row.getByRole('button', { name: '启用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '启用字典？', exact: true })
    .getByRole('button', { name: '确认启用', exact: true })
    .click()
  await row.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await values.getByRole('button', { name: '停用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '停用字典值？', exact: true })
    .getByRole('button', { name: '确认停用', exact: true })
    .click()
  await expect(values.getByRole('button', { name: '启用', exact: true })).toBeVisible()
  expect(calls.find((c) => c.action === 'DisableItem')?.body).toEqual({
    id: 201,
    dict_type_id: 101,
    version: '0',
  })
  await values.getByRole('button', { name: '启用', exact: true }).click()
  await page
    .getByRole('dialog', { name: '启用字典值？', exact: true })
    .getByRole('button', { name: '确认启用', exact: true })
    .click()
  await expect(values.getByRole('button', { name: '停用', exact: true })).toBeVisible()
  expect(calls.find((c) => c.action === 'EnableItem')?.body).toEqual({
    id: 201,
    dict_type_id: 101,
    version: '63928800000000003',
  })
  expect(calls.some((c) => /Delete/.test(c.action))).toBe(false)
})

test('page and Button resources govern access without any SA identity response field', async ({
  page,
}) => {
  const profileCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/Auth/CurrentProfile')) profileCalls.push(request.url())
  })
  let calls = await setup(page, { readOnly: true })
  await page.goto('/iam/dictionaries')
  await expect(page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '新建字典', exact: true })).toHaveCount(0)
  expect(calls.every((c) => c.action === 'Query')).toBe(true)
  await expect.poll(() => profileCalls.length).toBe(1)
  await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(values.locator('.el-table__row')).toHaveCount(1)
  await expect(values.getByRole('button', { name: '新增字典值', exact: true })).toHaveCount(0)
  await expect(values.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await expect(values.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
  expect(calls.every((c) => ['Query', 'QueryItems'].includes(c.action))).toBe(true)
  calls = await setup(page, { denied: true })
  await page.goto('/iam/dictionaries')
  await expect(page).toHaveURL(/403|forbidden/)
  expect(calls).toHaveLength(0)
})

test('backend SA rejection remains authoritative even when a write Button was granted', async ({
  page,
}) => {
  const calls = await setup(page, { rejectWriteAsNonSa: true })
  await page.goto('/iam/dictionaries')
  await page.getByRole('button', { name: '停用', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await dialog.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect(dialog.getByText('仅SA（集团超级管理员）才可操作', { exact: true })).toBeVisible()
  expect(calls.filter((c) => c.action === 'Disable')).toHaveLength(1)
  await expect(page.getByText('字典已停用', { exact: true })).toHaveCount(0)
})

test('unknown write outcome is not replayed and leaves the confirmation recoverable', async ({
  page,
}) => {
  const calls = await setup(page, { unknownWrite: true })
  await page.goto('/iam/dictionaries')
  await page.getByRole('button', { name: '停用', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '停用字典？', exact: true })
  await dialog.getByRole('button', { name: '确认停用', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '确认停用', exact: true })).toBeDisabled()
  await expect(dialog.getByText(/已阻止重复提交/)).toBeVisible()
  expect(calls.filter((c) => c.action === 'Disable')).toHaveLength(1)
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

test('create and edit submit the exact full DTOs without editable identity or generated codes', async ({
  page,
}) => {
  const calls = await setup(page, { uppercaseStatuses: true })
  await page.goto('/iam/dictionaries')
  await page.getByRole('button', { name: '新建字典', exact: true }).click()
  const create = page.getByRole('dialog', { name: '新建字典', exact: true })
  await create.getByLabel('字典编码', { exact: true }).fill('TEST_CODE')
  await create.getByLabel('字典名称', { exact: true }).fill('新字典')
  await create.getByRole('button', { name: '保存', exact: true }).click()
  await expect(create).not.toBeVisible()
  expect(calls.find((c) => c.action === 'Create')?.body).toEqual({
    dict_type_code: 'TEST_CODE',
    dict_type_name: '新字典',
    description: '',
    items: [],
  })
  await page.locator('.el-table__row').getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑字典', exact: true })
  await edit.getByLabel('字典名称', { exact: true }).fill('更正名称')
  await edit.getByRole('button', { name: '保存', exact: true }).click()
  await expect(edit).not.toBeVisible()
  expect(calls.find((c) => c.action === 'Update')?.body).toEqual({
    id: 101,
    version: token,
    dict_type_name: '更正名称',
    description: '平台共享资料',
  })
  await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
  const values = page.getByRole('dialog', { name: '字典值', exact: true })
  await values.getByRole('button', { name: '编辑', exact: true }).click()
  const editItem = page.getByRole('dialog', { name: '编辑字典值', exact: true })
  await editItem.getByLabel('字典值名称', { exact: true }).fill('更正值')
  await editItem.getByRole('button', { name: '保存', exact: true }).click()
  await expect(editItem).not.toBeVisible()
  expect(calls.find((c) => c.action === 'UpdateItem')?.body).toEqual({
    id: 201,
    dict_type_id: 101,
    version: '0',
    item_name: '更正值',
    description: '',
    sort_no: 0,
    item_color: '',
    status: 'active',
    ext_data: false,
  })
  await values.getByRole('button', { name: '新增字典值', exact: true }).click()
  const add = page.getByRole('dialog', { name: '新增字典值', exact: true })
  await add.getByLabel('字典值编码', { exact: true }).fill('air')
  await add.getByLabel('字典值名称', { exact: true }).fill('航空运输')
  await add.getByRole('button', { name: '保存', exact: true }).click()
  await expect(add).not.toBeVisible()
  expect(calls.find((c) => c.action === 'CreateItem')?.body).toEqual({
    dict_type_id: 101,
    item_code: 'air',
    item_name: '航空运输',
    description: '',
    sort_no: 0,
    item_color: '',
    status: 'active',
    ext_data: null,
  })
})

test('numeric version responses are rejected instead of repaired or submitted', async ({
  page,
}) => {
  const calls = await setup(page)
  await page.route('**/api/iam-admin/Dictionary/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        items: [{ ...dictionary, version: 123 }],
        total: 1,
        page_index: 1,
        page_size: 20,
      }),
    }),
  )
  await page.goto('/iam/dictionaries')
  await expect(page.getByText('字典接口必须返回原始字符串版本', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  expect(calls).toHaveLength(0)
})

test('reported exam question types with uppercase statuses open and retain the enabled edit state', async ({
  page,
}) => {
  await setup(page)
  const dict = {
    ...dictionary,
    id: 35,
    dict_type_code: 'training_exam_question_type',
    dict_type_name: '考试题型',
    description: '考试题目的题型',
    version: '63923944723326859',
  }
  const types = [
    [185, 'SINGLE_CHOICE', '单选题', '仅有一个正确选项'],
    [184, 'MULTIPLE_CHOICE', '多选题', '包含多个正确选项'],
    [183, 'TRUE_FALSE', '判断题', '判断陈述正确或错误'],
  ] as const
  const values = types.map(([id, code, name, description], index) => ({
    ...item,
    id,
    dict_type_id: 35,
    dict_type_code: dict.dict_type_code,
    item_code: code,
    item_name: name,
    description,
    sort_no: (index + 1) * 10,
    status: 'ACTIVE',
    ext_data: null,
    version: dict.version,
  }))
  await page.route('**/api/iam-admin/Dictionary/Query', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({ items: [{ ...dict, status: 'aCtIvE' }], total: 1 }),
    }),
  )
  const requests: unknown[] = []
  await page.route('**/api/iam-admin/Dictionary/QueryItems', (route) => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({
      contentType: 'application/json',
      body: success({ dictionary: dict, items: values, total: 3, page_index: 1, page_size: 20 }),
    })
  })
  await page.goto('/iam/dictionaries')
  await page.getByRole('button', { name: dict.dict_type_code, exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '字典值', exact: true })
  await expect(drawer.locator('.el-table__row')).toHaveCount(3)
  await expect(drawer.getByRole('button', { name: '停用', exact: true })).toHaveCount(3)
  await expect(drawer.getByText('字典接口响应缺少合法状态', { exact: true })).toHaveCount(0)
  expect(requests).toEqual([
    { dict_type_id: 35, page_index: 1, page_size: 20, keyword: '', status: null },
  ])
  const single = drawer.locator('.el-table__row').filter({ hasText: 'SINGLE_CHOICE' })
  await single.getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑字典值', exact: true })
  await expect(edit.getByLabel('字典值编码', { exact: true })).toHaveValue('SINGLE_CHOICE')
  await expect(edit.getByText('启用', { exact: true })).toBeVisible()
})

test('unknown and empty statuses remain invalid while historical null is never treated as active', async ({
  page,
}) => {
  await setup(page)
  let status: unknown = 'ARCHIVED'
  await page.route('**/api/iam-admin/Dictionary/QueryItems', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: success({
        dictionary,
        items: [{ ...item, status, is_available: false }],
        total: 1,
        page_index: 1,
        page_size: 20,
      }),
    }),
  )
  const drawer = page.getByRole('dialog', { name: '字典值', exact: true })
  for (const state of ['ARCHIVED', null, '']) {
    status = state
    await page.goto('/iam/dictionaries')
    await page.getByRole('button', { name: 'TRANSPORT_MODE', exact: true }).click()
    if (state === null) {
      await expect(
        drawer.getByText('未设置', { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible()
      await expect(drawer.getByRole('button', { name: '启用', exact: true })).toHaveCount(1)
      await expect(drawer.getByRole('button', { name: '停用', exact: true })).toHaveCount(0)
    } else {
      await expect(drawer.getByText('字典接口响应缺少合法状态', { exact: true })).toBeVisible()
      await expect(drawer.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
    }
  }
})
