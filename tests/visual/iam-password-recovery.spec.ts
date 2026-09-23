import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

test.describe('IAM password recovery candidate preview', () => {
  test('renders the focused auth pattern and supports local-only recovery interactions', async ({
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

    await page.goto(`${previewHost}/?preview=iam-password-recovery&capture=1&scenario=ready`)

    await expect(page.locator('[data-preview-id="iam-password-recovery"]')).toHaveAttribute(
      'data-preview-source',
      'canonical-feature',
    )
    await expect(page.locator('[data-auth-page-template]')).toHaveAttribute(
      'data-auth-page-variant',
      'focused',
    )
    await expect(page.getByRole('heading', { level: 1, name: '忘记密码？' })).toBeVisible()
    await expect(page.getByText('陆链控制台', { exact: true })).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath(`iam-password-recovery-${testInfo.project.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })

    await page.getByRole('button', { name: '发送验证码', exact: true }).click()
    await expect(page.getByText('请输入账号', { exact: true })).toBeVisible()
    await expect(page.locator('#recovery-account')).toBeFocused()

    await page.locator('#recovery-account').fill('dispatcher.demo')
    await page.getByRole('button', { name: '发送验证码', exact: true }).click()
    await expect(page.getByText('如果该账号可用于找回，请按后续验证提示继续。')).toBeVisible()

    await page.getByRole('button', { name: '返回登录' }).click()
    await expect(page.getByText('候选返回入口已验证；生产路由接入后返回登录页。')).toBeVisible()
    await expect(page).toHaveURL(/preview=iam-password-recovery/)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])
  })

  test('exposes stable pending, generic submitted, and retryable error states', async ({
    page,
  }) => {
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto(`${previewHost}/?preview=iam-password-recovery&capture=1&scenario=submitting`)
    await expect(page.locator('[data-page-state="submitting"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '正在发送' })).toBeDisabled()

    await page.goto(`${previewHost}/?preview=iam-password-recovery&capture=1&scenario=submitted`)
    await expect(page.locator('[data-page-state="submitted"]')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('找回请求已受理')
    await expect(page.getByText('如果该账号可用于找回，请按后续验证提示继续。')).toBeVisible()

    await page.goto(
      `${previewHost}/?preview=iam-password-recovery&capture=1&scenario=retryable-error`,
    )
    await expect(page.locator('[data-page-state="retryable-error"]')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('暂时无法提交找回请求，请稍后重试')
    await expect(page.getByRole('button', { name: '发送验证码', exact: true })).toBeEnabled()
    expect(runtimeMessages).toEqual([])
  })
})
