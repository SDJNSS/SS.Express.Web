import { expect, test } from '@playwright/test'

const previewUrl = 'http://127.0.0.1:4174/?preview=iam-application-resources&capture=1'

test.describe('shared form drawer unsaved changes guard', () => {
  test('keeps the drawer and draft after continuing, then discards and can reopen', async ({
    page,
  }) => {
    await page.goto(previewUrl)

    await page.getByRole('button', { name: '新增 App' }).click()
    const drawer = page.getByRole('dialog', { name: '新增 App' })
    const appName = drawer.getByLabel('App 名称')
    await appName.fill('待保留的草稿')

    await page.mouse.click(16, 120)
    const discardDialog = page.getByRole('dialog', { name: '放弃未保存的 App 信息？' })
    await expect(discardDialog).toBeVisible()
    await discardDialog.getByRole('button', { name: '继续编辑' }).click()

    await expect(drawer).toBeVisible()
    await expect(appName).toHaveValue('待保留的草稿')

    await page.keyboard.press('Escape')
    await expect(discardDialog).toBeVisible()
    await discardDialog.getByRole('button', { name: '继续编辑' }).click()
    await expect(appName).toHaveValue('待保留的草稿')

    await drawer.locator('.el-drawer__close-btn').click()
    await expect(discardDialog).toBeVisible()
    await discardDialog.getByRole('button', { name: '继续编辑' }).click()
    await expect(appName).toHaveValue('待保留的草稿')

    await drawer.getByRole('button', { name: '取消' }).click()
    await discardDialog.getByRole('button', { name: '放弃修改' }).click()
    await expect(drawer).toBeHidden()

    await page.getByRole('button', { name: '新增 App' }).click()
    await expect(page.getByRole('dialog', { name: '新增 App' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: '新增 App' }).getByLabel('App 名称')).toHaveValue(
      '',
    )
  })

  test('guards drawers that rely on shared interaction tracking', async ({ page }) => {
    await page.goto('http://127.0.0.1:4174/?preview=iam-group-profile&capture=1')

    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.getByRole('dialog', { name: '编辑集团信息' })
    const groupName = drawer.getByRole('textbox', { name: '集团名称' })
    const originalName = await groupName.inputValue()
    await groupName.fill(`${originalName}·草稿`)

    await page.mouse.click(16, 120)
    const discardDialog = page.getByRole('dialog', { name: '放弃未保存的修改？' })
    await expect(discardDialog).toBeVisible()
    await discardDialog.getByRole('button', { name: '继续编辑' }).click()

    await expect(drawer).toBeVisible()
    await expect(groupName).toHaveValue(`${originalName}·草稿`)
  })

  test('tracks authored select changes without a page-local dirty implementation', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:4174/?preview=iam-group-profile&capture=1')

    await page.getByRole('button', { name: '编辑集团信息' }).click()
    const drawer = page.getByRole('dialog', { name: '编辑集团信息' })
    await drawer
      .locator('.el-form-item')
      .filter({ hasText: '默认语言' })
      .locator('.el-select')
      .click()
    await page.getByRole('option', { name: 'English' }).click()

    await page.mouse.click(16, 120)
    await expect(page.getByRole('dialog', { name: '放弃未保存的修改？' })).toBeVisible()
  })
})
