import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

test.describe('IAM login candidate preview', () => {
  test('renders the standalone auth pattern and supports local-only form interactions', async ({
    page,
  }, testInfo) => {
    const runtimeMessages: string[] = []
    const businessRequests: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('request', (request) => {
      if (['fetch', 'xhr', 'websocket', 'eventsource'].includes(request.resourceType())) {
        businessRequests.push(request.url())
      }
    })

    await page.goto(`${previewHost}/?preview=iam-login&capture=1&scenario=ready`)

    await expect(page.locator('[data-preview-id="iam-login"]')).toHaveAttribute(
      'data-preview-source',
      'canonical-feature',
    )
    await expect(page.locator('[data-auth-page-template]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '登录陆链控制台' })).toBeVisible()
    await expect(page.getByText('统一身份网关', { exact: true })).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath(`iam-login-${testInfo.project.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })

    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByText('请输入账号', { exact: true })).toBeVisible()
    await expect(page.getByText('请输入密码', { exact: true })).toBeVisible()
    await expect(page.locator('#login-account')).toBeFocused()

    await page.locator('#login-account').fill('dispatcher.demo')
    await page.locator('#login-password').fill('candidate-only')
    await page.getByRole('button', { name: '显示密码' }).click()
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'text')
    await expect(page.locator('#login-password')).toBeFocused()
    const rememberCheckbox = page.getByRole('checkbox', { name: '记住我' })
    await page.getByText('记住我', { exact: true }).click()
    await expect(rememberCheckbox).toBeChecked()

    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByText('候选交互已验证；正式登录需接入 IAM 服务。')).toBeVisible()
    await page.getByRole('button', { name: '忘记密码' }).click()
    await expect(page.getByText('密码找回流程将在生产接入时由 IAM 策略确定。')).toBeVisible()
    await expect(page).toHaveURL(/preview=iam-login/)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('exposes submitting and generic authentication error states', async ({ page }) => {
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto(`${previewHost}/?preview=iam-login&capture=1&scenario=submitting`)
    await expect(page.locator('[data-page-state="submitting"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '正在登录' })).toBeDisabled()

    await page.goto(`${previewHost}/?preview=iam-login&capture=1&scenario=auth-error`)
    await expect(page.locator('[data-page-state="auth-error"]')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('账号或密码不正确，请检查后重试')
    expect(runtimeMessages).toEqual([])
  })
})
