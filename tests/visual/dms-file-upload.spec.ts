import { expect, test, type Page } from '@playwright/test'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const imageBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=',
  'base64',
)
const imageFile = { name: 'brand.png', mimeType: 'image/png', buffer: imageBytes }
const success = (data: unknown) =>
  JSON.stringify({ data, is_success: true, status: 'success', code: 1, message: '' })
const uploaded = (fileId = 'file_image') => ({
  file_id: fileId,
  upload_id: 'upload_test',
  status: 'AVAILABLE',
  original_name: 'brand.png',
  file_category: 'IMAGE',
  content_type: 'image/png',
  file_size_bytes: imageBytes.length,
  media_duration_ms: 0,
  idempotent: false,
})

async function mockFiles(page: Page) {
  const uploads: { body: string; headers: Record<string, string> }[] = []
  const accesses: Record<string, unknown>[] = []
  const ossHeaders: Record<string, string>[] = []
  await page.route('**/api/dms/File/Upload', async (route) => {
    uploads.push({
      body: route.request().postDataBuffer()?.toString() ?? '',
      headers: route.request().headers(),
    })
    await route.fulfill({
      contentType: 'application/json',
      body: success(uploaded(`file_image_${uploads.length}`)),
    })
  })
  await page.route('**/api/dms/File/GetAccessUrl', async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>
    accesses.push(request)
    await route.fulfill({
      contentType: 'application/json',
      body: success({
        ...request,
        url: 'https://files.example.test/image.png?signature=temporary',
        expires_at: new Date(Date.now() + 300_000).toISOString(),
      }),
    })
  })
  await page.route('https://files.example.test/**', async (route) => {
    ossHeaders.push(route.request().headers())
    await route.fulfill({ contentType: 'image/png', body: imageBytes })
  })
  return { uploads, accesses, ossHeaders }
}

test.describe('DMS file integration', () => {
  for (const scenario of [
    {
      path: '/iam/group',
      open: '编辑集团信息',
      save: '保存集团信息',
      endpoint: 'Group/Update',
      field: 'logo_file_id',
      url: 'logo_url',
    },
    {
      path: '/iam/tenants',
      open: '编辑',
      save: '保存 Tenant',
      endpoint: 'Tenant/Update',
      field: 'logo_file_id',
      url: 'logo_url',
    },
    {
      path: '/iam/members',
      open: '编辑用户',
      save: '保存全局资料',
      endpoint: 'Membership/UpdateUser',
      field: 'avatar_file_id',
      url: 'avatar_url',
    },
  ]) {
    test(`uploads multipart and persists file ID for ${scenario.path}`, async ({
      page,
    }, testInfo) => {
      await useAuthenticatedSession(page)
      const files = await mockFiles(page)
      let saved: Record<string, unknown> | undefined
      await page.route(`**/api/iam-admin/${scenario.endpoint}`, async (route) => {
        saved = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({
          contentType: 'application/json',
          body: success({
            ...saved,
            [scenario.url]: 'https://files.example.test/image.png?signature=iam',
            platform_name: 'SS Express',
            updated_at: '2026-09-16',
            status: 'ACTIVE',
          }),
        })
      })
      await page.goto(scenario.path)
      await page.getByRole('button', { name: scenario.open, exact: true }).first().click()
      const drawer = page.locator('.el-drawer:visible')
      await drawer.locator('input[type=file]').setInputFiles(imageFile)
      await expect(drawer.getByText('brand.png：上传完成')).toBeVisible()
      await expect(drawer.getByText('文件 ID：file_image_1')).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath('upload-complete.png'),
        animations: 'disabled',
      })
      await drawer.getByRole('button', { name: scenario.save, exact: true }).click()
      await expect.poll(() => saved?.[scenario.field]).toBe('file_image_1')
      expect(saved?.[scenario.url]).toBe('')
      expect(JSON.stringify(saved)).not.toContain('signature=')
      expect(files.uploads[0]?.headers.authorization).toBe('Bearer visual-test-access-token')
      expect(files.uploads[0]?.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/)
      expect(files.uploads[0]?.body).toContain('name="file"; filename="brand.png"')
      expect(files.uploads[0]?.body).toContain('name="source_app_id"')
      expect(files.uploads[0]?.body).toContain('name="source_app_code"\r\n\r\nIAM')
      expect(files.accesses).toHaveLength(0)
      if (scenario.path === '/iam/group') {
        await expect(page.locator('.group-identity__logo img')).toHaveAttribute(
          'src',
          /signature=iam/,
        )
        expect(files.ossHeaders.length).toBeGreaterThan(0)
        expect(files.ossHeaders.every((headers) => !headers.authorization)).toBe(true)
      }
    })
  }

  test('blocks save on failure and keeps the same idempotency key for manual retry', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await mockFiles(page)
    const bodies: string[] = []
    await page.route('**/api/dms/File/Upload', async (route) => {
      bodies.push(route.request().postDataBuffer()?.toString() ?? '')
      if (bodies.length === 1) await route.abort('connectionreset')
      else
        await route.fulfill({
          contentType: 'application/json',
          body: success(uploaded('file_retry')),
        })
    })
    await page.goto('/iam/group')
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer:visible')
    await drawer.locator('input[type=file]').setInputFiles(imageFile)
    await expect(drawer.getByRole('button', { name: '重试上传' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: '保存集团信息' })).toBeDisabled()
    await drawer.getByRole('button', { name: '重试上传' }).click()
    await expect(drawer.getByText('文件 ID：file_retry')).toBeVisible()
    await expect(drawer.getByRole('button', { name: '保存集团信息' })).toBeEnabled()
    const key = (body: string) => /name="idempotency_key"\r\n\r\n([^\r]+)/u.exec(body)?.[1]
    expect(key(bodies[0] ?? '')).toBeTruthy()
    expect(key(bodies[0] ?? '')).toBe(key(bodies[1] ?? ''))
  })

  test('validates files before dispatch and clears removed references', async ({ page }) => {
    await useAuthenticatedSession(page)
    const files = await mockFiles(page)
    await page.goto('/iam/group')
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer:visible')
    const input = drawer.locator('input[type=file]')
    await input.setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) })
    await expect(drawer.getByRole('alert').filter({ hasText: '不能选择空文件' })).toBeVisible()
    await input.setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid'),
    })
    await expect(drawer.getByText(/不支持此文件类型/)).toBeVisible()
    expect(files.uploads).toHaveLength(0)
    await input.setInputFiles(imageFile)
    await expect(drawer.getByText('文件 ID：file_image_1')).toBeVisible()
    await expect(drawer.locator('.el-upload-list__item')).toHaveCount(1)
    await drawer.locator('.el-upload-list__item').hover()
    await drawer.locator('.el-upload-list__item-delete').click()
    await expect(drawer.getByText('文件 ID：file_image_1')).toHaveCount(0)
    await expect(drawer.locator('.el-upload-list__item')).toHaveCount(0)
  })

  test('saves Tenant logo and first administrator avatar IDs across wizard steps', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await mockFiles(page)
    let saved: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Tenant/Create', async (route) => {
      saved = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: success({ ...saved, id: 4, version: '2' }),
      })
    })
    await page.goto('/iam/tenants')
    await page.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    const drawer = page.locator('.el-drawer:visible')
    await drawer.getByLabel('Tenant 名称', { exact: true }).fill('上传测试租户')
    await drawer
      .locator('.el-form-item')
      .filter({ hasText: 'Tenant 类型' })
      .locator('.el-select__wrapper')
      .click()
    await page.getByRole('option', { name: '企业租户', exact: true }).click()
    const logoField = drawer.locator('.el-form-item').filter({ hasText: 'Tenant Logo' })
    await logoField.locator('input[type=file]').setInputFiles(imageFile)
    await expect(drawer.getByText('文件 ID：file_image_1')).toBeVisible()
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await drawer.getByText('创建新用户', { exact: true }).click()
    await drawer.getByLabel('新用户登录账号', { exact: true }).fill('upload.admin')
    await drawer.getByLabel('有效开始时间', { exact: true }).fill('2026-09-01 00:00:00')
    const avatarField = drawer.locator('.el-form-item').filter({ hasText: '管理员头像' })
    await avatarField.locator('input[type=file]').setInputFiles(imageFile)
    await expect(drawer.getByText('文件 ID：file_image_2')).toBeVisible()
    await drawer.getByRole('button', { name: '上一步', exact: true }).click()
    await expect(logoField.locator('.el-upload-list__item-thumbnail')).toBeVisible()
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await expect(avatarField.locator('.el-upload-list__item-thumbnail')).toBeVisible()
    await drawer.getByRole('button', { name: '下一步', exact: true }).click()
    await drawer.getByRole('button', { name: '创建 Tenant', exact: true }).click()
    await expect.poll(() => saved?.logo_file_id).toBe('file_image_1')
    expect(saved).toMatchObject({
      logo_url: '',
      initial_admin: { new_user: { avatar_file_id: 'file_image_2', avatar_url: '' } },
    })
  })

  test('requires video validation and retries validation without uploading twice', async ({
    page,
  }) => {
    let uploadCount = 0
    let validationCount = 0
    await page.route('**/api/dms/File/Upload', async (route) => {
      uploadCount++
      await route.fulfill({
        contentType: 'application/json',
        body: success({ ...uploaded('file_video'), file_category: 'VIDEO' }),
      })
    })
    await page.route('**/api/dms/File/ValidateVideo', async (route) => {
      validationCount++
      expect(route.request().postDataJSON()).toEqual({ file_id: 'file_video' })
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          file_id: 'file_video',
          is_valid: validationCount > 1,
          status: 'AVAILABLE',
          file_category: 'VIDEO',
          content_type: 'video/mp4',
          media_duration_ms: 120123,
        }),
      })
    })
    await page.goto('/login')
    const result = await page.evaluate(async () => {
      window.sessionStorage.setItem('access_token', 'upload-test')
      const modulePath = '/src/features/dms/files/public.ts'
      const { createDmsUploadTask } = await import(/* @vite-ignore */ modulePath)
      const task = createDmsUploadTask({
        file: new File(['video'], 'lesson.mp4', { type: 'video/mp4' }),
        source_app_id: 1,
        source_app_code: 'IAM',
        file_category: 'VIDEO',
      })
      let firstError = ''
      try {
        await task.run()
      } catch (error) {
        firstError = (error as Error).message
      }
      return { firstError, result: await task.run() }
    })
    expect(result.firstError).toContain('视频校验未通过')
    expect(result.result.media_duration_ms).toBe(120123)
    expect(uploadCount).toBe(1)
    expect(validationCount).toBe(2)
  })

  test('preserves the uploaded avatar when creating a new member', async ({ page }) => {
    await useAuthenticatedSession(page)
    await mockFiles(page)
    let saved: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Membership/CreateMember', async (route) => {
      saved = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        contentType: 'application/json',
        body: success({ id: 8, version: '2' }),
      })
    })
    await page.goto('/iam/members')
    await page.getByRole('button', { name: '新增 Tenant 成员' }).click()
    const drawer = page.locator('.el-drawer:visible')
    await drawer.getByLabel('登录账号', { exact: true }).fill('avatar.member')
    await drawer.getByLabel('姓名', { exact: true }).fill('头像成员')
    await drawer.locator('input[type=file]').setInputFiles(imageFile)
    await expect(drawer.getByText('文件 ID：file_image_1')).toBeVisible()
    await drawer.getByRole('button', { name: '下一步' }).click()
    await drawer
      .getByLabel('有效开始时间（Asia/Shanghai）', { exact: true })
      .fill('2026-09-17 00:00:00')
    await drawer.getByRole('button', { name: '下一步' }).click()
    await drawer.getByRole('button', { name: '创建成员', exact: true }).click()
    await expect.poll(() => saved).toBeTruthy()
    expect(saved).toMatchObject({ new_user: { avatar_file_id: 'file_image_1', avatar_url: '' } })
  })

  test('cancel and drawer close do not apply a late upload result', async ({ page }) => {
    await useAuthenticatedSession(page)
    const files = await mockFiles(page)
    let finishUpload: (() => void) | undefined
    let dispatched = false
    await page.route('**/api/dms/File/Upload', async (route) => {
      dispatched = true
      await new Promise<void>((resolve) => {
        finishUpload = resolve
      })
      await route
        .fulfill({ contentType: 'application/json', body: success(uploaded('file_late')) })
        .catch(() => undefined)
    })
    await page.goto('/iam/group')
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer:visible')
    await drawer.locator('input[type=file]').setInputFiles(imageFile)
    await expect.poll(() => dispatched).toBe(true)
    await expect(drawer.getByRole('button', { name: '保存集团信息' })).toBeDisabled()
    await drawer.getByRole('button', { name: '取消上传', exact: true }).click()
    await expect(drawer.getByText(/上传已取消/)).toBeVisible()
    finishUpload?.()
    await drawer.getByRole('button', { name: '取消', exact: true }).click()
    await page
      .getByRole('dialog', { name: '放弃未保存的修改？', exact: true })
      .getByRole('button', { name: '放弃修改', exact: true })
      .click()
    await expect(drawer).toHaveCount(0)
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    await expect(page.getByText('文件 ID：file_late')).toHaveCount(0)
    expect(files.accesses).toHaveLength(0)
  })

  test('does not resolve a missing IAM image URL through DMS', async ({ page }) => {
    await useAuthenticatedSession(page)
    const files = await mockFiles(page)
    await page.route('**/api/iam-admin/Group/Info', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          id: 1,
          group_name: '无图片地址集团',
          logo_file_id: 'file_existing',
          logo_url: '',
          version: '1',
        }),
      })
    })
    await page.goto('/iam/group')
    await expect(page.getByLabel('集团 Logo 未设置')).toBeVisible()
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer:visible')
    await expect(drawer.getByText('文件 ID：file_existing')).toBeVisible()
    await expect(drawer.getByRole('button', { name: '保存集团信息' })).toBeEnabled()
    expect(files.accesses).toHaveLength(0)
  })

  test('reads an existing file ID and preserves it without re-uploading', async ({ page }) => {
    await useAuthenticatedSession(page)
    const files = await mockFiles(page)
    await page.route('**/api/iam-admin/Group/Info', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: success({
          id: 1,
          group_code: 'SS',
          group_name: '已有 Logo 集团',
          logo_file_id: 'file_existing',
          logo_url: 'https://files.example.test/image.png?signature=iam',
          version: '1',
        }),
      })
    })
    let saved: Record<string, unknown> | undefined
    await page.route('**/api/iam-admin/Group/Update', async (route) => {
      saved = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ contentType: 'application/json', body: success(saved) })
    })
    await page.goto('/iam/group')
    await expect(page.locator('.group-identity__logo img')).toHaveAttribute('src', /signature=iam/)
    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.locator('.el-drawer:visible')
    await expect(drawer.getByText('文件 ID：file_existing')).toBeVisible()
    await expect(drawer.locator('.el-upload-list__item-thumbnail')).toHaveAttribute(
      'src',
      /signature=iam/,
    )
    await drawer.getByRole('button', { name: '保存集团信息' }).click()
    await expect.poll(() => saved?.logo_file_id).toBe('file_existing')
    expect(saved?.logo_url).toBe('')
    expect(files.uploads).toHaveLength(0)
    expect(files.accesses).toHaveLength(0)
  })

  for (const kind of ['tenant', 'user'] as const) {
    test(`uses IAM ${kind} URL in details and edit without DMS access`, async ({
      page,
    }, testInfo) => {
      await useAuthenticatedSession(page)
      const files = await mockFiles(page)
      const imageUrl = `https://files.example.test/${kind}.png?signature=iam`
      const isTenant = kind === 'tenant'
      const endpoint = isTenant ? 'Tenant/Query' : 'Membership/QueryUsers'
      const record = isTenant
        ? {
            id: 1,
            tenant_code: 'PLATFORM',
            tenant_name: '测试租户',
            group_id: 1,
            logo_file_id: 'file_tenant',
            logo_url: imageUrl,
            status: 'ACTIVE',
            version: '1',
          }
        : {
            user_id: 1001,
            tenant_user_id: 1,
            tenant_id: 1,
            tenant_code: 'PLATFORM',
            display_name: '林嘉',
            user_status: 'ACTIVE',
            member_status: 'ACTIVE',
            user_version: '1',
            member_version: '1',
            is_member_currently_effective: true,
            user: {
              id: 1001,
              user_name: '林嘉',
              real_name: '林嘉',
              avatar_file_id: 'file_user',
              avatar_url: imageUrl,
              status: 'ACTIVE',
              version: '1',
            },
            memberships: [
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
                left_at: '',
                is_currently_effective: true,
                membership_is_currently_effective: true,
                member_version: '1',
                tenant_status: 'ACTIVE',
                tenant_is_deleted: false,
                updated_at: '2026-09-17T00:00:00Z',
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
                member_status: 'ACTIVE',
                is_tenant_admin: false,
                joined_at: '2026-02-01T00:00:00Z',
                left_at: '',
                is_currently_effective: true,
                membership_is_currently_effective: true,
                member_version: '1',
                tenant_status: 'ACTIVE',
                tenant_is_deleted: false,
                updated_at: '2026-09-17T00:00:00Z',
              },
            ],
            organizations: [],
            positions: [],
          }
      await page.route(`**/api/iam-admin/${endpoint}`, (route) => {
        const request = route.request().postDataJSON() as { page_size?: number }
        return route.fulfill({
          contentType: 'application/json',
          body: success({
            total: 1,
            page_index: 1,
            page_size: request.page_size ?? 20,
            items: [record],
          }),
        })
      })
      await page.goto(isTenant ? '/iam/tenants' : '/iam/members')
      if (!isTenant) {
        await expect(page.locator('.app-shell__avatar-image')).toHaveAttribute('src', imageUrl)
      }
      await page.getByRole('button', { name: '详情', exact: true }).first().click()
      const drawer = page.locator('.el-drawer:visible')
      const detailImage = isTenant ? '.tenant-detail__logo img' : '.membership-detail__hero img'
      await expect(drawer.locator(detailImage)).toHaveAttribute('src', imageUrl)
      await expect(drawer.locator(detailImage)).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath('iam-image-detail.png'),
        animations: 'disabled',
      })
      await drawer.locator('.el-drawer__close-btn').click()
      await expect(drawer).toHaveCount(0)
      await page
        .getByRole('button', { name: isTenant ? '编辑' : '编辑用户', exact: true })
        .first()
        .click()
      await expect(drawer.locator('.el-upload-list__item-thumbnail')).toHaveAttribute(
        'src',
        imageUrl,
      )
      expect(files.accesses).toHaveLength(0)
      expect(files.uploads).toHaveLength(0)
      expect(files.ossHeaders.length).toBeGreaterThan(0)
      expect(files.ossHeaders.every((headers) => !headers.authorization)).toBe(true)
    })
  }

  test('rejects a completed upload if the Tenant changed while it was pending', async ({
    page,
  }) => {
    await page.route('**/api/dms/File/Upload', async (route) => {
      await page.evaluate(() => window.sessionStorage.setItem('login_tenant_id', '2'))
      await route.fulfill({
        contentType: 'application/json',
        body: success(uploaded('file_old_tenant')),
      })
    })
    await page.goto('/login')
    const message = await page.evaluate(async () => {
      const sessionPath = '/src/shared/api/authSession.ts'
      const { setStoredAuthSession } = await import(/* @vite-ignore */ sessionPath)
      setStoredAuthSession({
        accessToken: 'test-upload',
        loginState: 'AUTHENTICATED',
        account: 'tester',
        userId: '1',
        currentTenantId: 1,
      })
      const modulePath = '/src/features/dms/files/public.ts'
      const { createDmsFileTransferGateway } = await import(/* @vite-ignore */ modulePath)
      const gateway = createDmsFileTransferGateway(() => ({ id: 1, app_code: 'IAM' }))
      const task = gateway.createTask(
        new File(['image'], 'logo.png', { type: 'image/png' }),
        'IMAGE',
      )
      try {
        await task.run({ signal: new AbortController().signal, onProgress: () => undefined })
        return 'unexpected success'
      } catch (error) {
        return (error as Error).message
      }
    })
    expect(message).toContain('Tenant 或应用已变化')
  })

  test('Candidate file selection never calls DMS', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/dms/')) requests.push(request.url())
    })
    await page.goto('http://127.0.0.1:4174/?preview=training-course-management&capture=1')
    await page.getByRole('button', { name: '新建课程', exact: true }).click()
    await page.locator('.el-drawer:visible input[type=file]').setInputFiles({
      name: 'lesson.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('preview-only'),
    })
    await expect(page.locator('.el-drawer:visible').getByText('lesson.mp4')).toBeVisible()
    expect(requests).toEqual([])
  })
})
