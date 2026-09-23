import { expect, test } from '@playwright/test'

const previewHost = 'http://127.0.0.1:4174'

test.describe('platform framework shell approved preview', () => {
  test('uses the shared shell and ListPage pattern with local-only interactions', async ({
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

    await page.goto(`${previewHost}/?preview=platform-framework-shell&capture=1&scenario=ready`)
    await expect(page.locator('[data-preview-id="platform-framework-shell"]')).toHaveAttribute(
      'data-preview-source',
      'canonical-feature',
    )
    await expect(page.getByTestId('platform-framework-shell')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: '运输任务' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'TMS 运输管理导航' })).toBeVisible()
    await expect(page.getByText('TRIP-20260904-0186', { exact: true })).toBeVisible()

    const sidebar = page.locator('.app-shell__sidebar')
    const collapseButton = page.getByRole('button', { name: '收起侧栏' })
    const sidebarBox = await sidebar.boundingBox()
    const collapseBox = await collapseButton.boundingBox()
    expect(sidebarBox).not.toBeNull()
    expect(collapseBox).not.toBeNull()
    expect(collapseBox?.width).toBe(44)
    expect(collapseBox?.height).toBe(44)
    expect(
      Math.abs(
        (collapseBox?.y ?? 0) +
          (collapseBox?.height ?? 0) / 2 -
          ((sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0) / 2),
      ),
    ).toBeLessThan(2)
    await expect(collapseButton).toHaveAttribute('data-direction', 'left')

    const separatorOpacity = await page
      .locator('.app-shell__system-tab')
      .nth(1)
      .evaluate((element) => getComputedStyle(element, '::before').opacity)
    expect(separatorOpacity).toBe('0.6')

    const userMenu = sidebar.getByRole('button', { name: '打开用户菜单' })
    await expect(userMenu).toContainText('林嘉')
    await expect(
      page.locator('.app-shell__tools').getByRole('button', { name: '打开用户菜单' }),
    ).toHaveCount(0)
    await userMenu.click()
    await expect(page.getByText('个人设置', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')

    const dispatchGroup = page.getByRole('button', { name: '调度中心' })
    await expect(dispatchGroup).toHaveAttribute('aria-expanded', 'true')
    await dispatchGroup.click()
    await expect(dispatchGroup).toHaveAttribute('aria-expanded', 'false')
    await dispatchGroup.click()
    await expect(dispatchGroup).toHaveAttribute('aria-expanded', 'true')

    await collapseButton.click()
    await expect(page.getByTestId('platform-framework-shell')).toHaveAttribute(
      'data-collapsed',
      'true',
    )
    const expandButton = page.getByRole('button', { name: '展开侧栏' })
    await expect(expandButton).toHaveAttribute('data-direction', 'right')
    await expect(userMenu).not.toContainText('林嘉')
    await expandButton.click()
    await expect(page.getByTestId('platform-framework-shell')).toHaveAttribute(
      'data-collapsed',
      'false',
    )

    await page.getByPlaceholder('输入任务编号、线路或车辆').fill('不存在的任务')
    await page.getByRole('button', { name: '查询', exact: true }).click()
    await expect(page.getByText('暂无符合条件的数据')).toBeVisible()
    await page.getByRole('button', { name: '重置', exact: true }).click()
    await expect(page.getByText('TRIP-20260904-0186', { exact: true })).toBeVisible()
    await expect(page.locator('[data-page-state="ready"]')).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(businessRequests).toEqual([])
    expect(runtimeMessages).toEqual([])

    await page.screenshot({
      path: testInfo.outputPath(`platform-framework-shell-${testInfo.project.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('exposes loading, empty and retryable error states without changing routes', async ({
    page,
  }) => {
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.goto(`${previewHost}/?preview=platform-framework-shell&capture=1&scenario=loading`)
    await expect(page.locator('[data-page-state="loading"]')).toBeVisible()
    await expect(page.locator('.el-loading-mask')).toBeVisible()

    await page.goto(`${previewHost}/?preview=platform-framework-shell&capture=1&scenario=empty`)
    await expect(page.locator('[data-page-state="empty"]')).toBeVisible()
    await expect(page.getByText('暂无符合条件的数据')).toBeVisible()

    await page.goto(
      `${previewHost}/?preview=platform-framework-shell&capture=1&scenario=retryable-error`,
    )
    await expect(page.locator('[data-page-state="retryable-error"]')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('任务数据暂时无法加载')
    await page.getByRole('button', { name: '重新加载' }).click()
    await expect(page.locator('[data-page-state="ready"]')).toBeVisible()
    await expect(page).toHaveURL(/preview=platform-framework-shell/)
    expect(runtimeMessages).toEqual([])
  })

  test('lets an ordinary list grow naturally and keeps AppPage as the vertical scroll owner', async ({
    page,
  }) => {
    await page.goto(`${previewHost}/?preview=platform-framework-shell&capture=1&scenario=ready`)

    const appPage = page.locator('[data-app-page]')
    const listPage = page.locator('.list-page-template')
    const dataTable = listPage.locator('.el-table').first()
    const tableBody = dataTable.locator('.el-table__body-wrapper')

    await expect(listPage).toHaveAttribute('data-scroll-mode', 'page')
    await expect(dataTable).toHaveAttribute('data-scroll-mode', 'page')
    await expect
      .poll(() => tableBody.evaluate((element) => element.scrollHeight <= element.clientHeight + 1))
      .toBe(true)
    await expect
      .poll(() => appPage.evaluate((element) => getComputedStyle(element).overflowY))
      .toBe('auto')

    await listPage.evaluate((element) => {
      const probe = document.createElement('div')
      probe.dataset.scrollProbe = 'list-page'
      probe.style.blockSize = `${element.clientHeight}px`
      probe.setAttribute('aria-hidden', 'true')
      element.append(probe)
    })

    await expect
      .poll(() => appPage.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true)
    await appPage.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect.poll(() => appPage.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    await expect(dataTable).toBeVisible()
  })
})
