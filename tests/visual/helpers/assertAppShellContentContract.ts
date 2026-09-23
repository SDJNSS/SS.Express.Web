import { expect, type Page } from '@playwright/test'

export async function assertAppShellContentContract(page: Page, route: string) {
  const content = page.locator('[data-app-shell-content]')
  const appPage = content.locator('[data-app-page]')
  const breadcrumb = page.locator('.app-shell__breadcrumb')

  await expect(content, `${route} 应由 AppShell 提供内容区`).toBeVisible()
  await expect(appPage, `${route} 应使用唯一 AppPage 页面根`).toHaveCount(1)
  await expect(breadcrumb, `${route} 应由壳层提供面包屑标题栏`).toBeVisible()
  await expect(
    breadcrumb.locator('h1.app-shell__breadcrumb-title'),
    `${route} 应由面包屑最后一级提供唯一可见页面标题`,
  ).toBeVisible()
  await expect(
    content.locator('.page-header__copy:visible'),
    `${route} 不得在内容区重复绘制 PageHeader 标题副本`,
  ).toHaveCount(0)

  const pageHeaderActionPlacement = await page
    .locator('.page-header__actions')
    .evaluateAll((actions) => ({
      total: actions.length,
      misplaced: actions.filter((action) => !action.closest('.app-shell__breadcrumb-actions'))
        .length,
    }))
  expect(
    pageHeaderActionPlacement.misplaced,
    `${route} 的 PageHeader 页面动作必须装配到面包屑右侧`,
  ).toBe(0)

  const breadcrumbAlignment = await breadcrumb.evaluate((element) => {
    const trail = element.querySelector<HTMLElement>('.app-shell__breadcrumb-trail')
    const currentItem = element.querySelector<HTMLElement>('.el-breadcrumb__item:last-child')
    const title = element.querySelector<HTMLElement>('h1.app-shell__breadcrumb-title')
    if (!trail || !currentItem || !title) return null

    const verticalCenter = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect()
      return rect.top + rect.height / 2
    }

    const trailCenter = verticalCenter(trail)
    return {
      itemDelta: Math.abs(verticalCenter(currentItem) - trailCenter),
      titleDelta: Math.abs(verticalCenter(title) - trailCenter),
    }
  })
  expect(breadcrumbAlignment, `${route} 应可测量面包屑垂直对齐`).not.toBeNull()
  expect(
    breadcrumbAlignment?.itemDelta,
    `${route} 的面包屑当前项必须与路径垂直居中`,
  ).toBeLessThanOrEqual(1)
  expect(
    breadcrumbAlignment?.titleDelta,
    `${route} 的面包屑标题必须与路径垂直居中`,
  ).toBeLessThanOrEqual(1)

  const measurements = await page.evaluate(() => {
    const contentElement = document.querySelector<HTMLElement>('[data-app-shell-content]')
    const appPageElement = contentElement?.querySelector<HTMLElement>('[data-app-page]')
    if (!contentElement || !appPageElement) return null

    const contentRect = contentElement.getBoundingClientRect()
    const pageRect = appPageElement.getBoundingClientRect()
    const tolerance = 1
    const scrollCandidates = [appPageElement, ...appPageElement.querySelectorAll<HTMLElement>('*')]
    const verticalScrollOwners = scrollCandidates.filter((element) => {
      const overflowY = getComputedStyle(element).overflowY
      return element.clientHeight > 0 && (overflowY === 'auto' || overflowY === 'scroll')
    })
    const originalScrollTop = appPageElement.scrollTop
    const scrollProbe = document.createElement('div')
    scrollProbe.setAttribute('aria-hidden', 'true')
    scrollProbe.style.flex = '0 0 auto'
    scrollProbe.style.inlineSize = '1px'
    scrollProbe.style.blockSize = `${Math.max(appPageElement.clientHeight + 64, 256)}px`
    appPageElement.appendChild(scrollProbe)
    const appPageProbeScrollable =
      appPageElement.scrollHeight > appPageElement.clientHeight + tolerance
    appPageElement.scrollTop = Math.min(
      64,
      Math.max(0, appPageElement.scrollHeight - appPageElement.clientHeight),
    )
    const appPageProbeScrollTop = appPageElement.scrollTop
    appPageElement.scrollTop = originalScrollTop
    scrollProbe.remove()

    return {
      appPageScrollMode: appPageElement.dataset.scrollMode,
      appPageOverflowY: getComputedStyle(appPageElement).overflowY,
      verticalScrollOwnerCount: verticalScrollOwners.length,
      documentHorizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + tolerance,
      contentHorizontalOverflow:
        contentElement.scrollWidth > contentElement.clientWidth + tolerance,
      contentVerticalOverflow:
        contentElement.scrollHeight > contentElement.clientHeight + tolerance,
      pageHorizontalOverflow: appPageElement.scrollWidth > appPageElement.clientWidth + tolerance,
      pageInsideContent:
        pageRect.left >= contentRect.left - tolerance &&
        pageRect.right <= contentRect.right + tolerance &&
        pageRect.top >= contentRect.top - tolerance &&
        pageRect.bottom <= contentRect.bottom + tolerance,
      appPageProbeScrollable,
      appPageProbeScrollTop,
    }
  })

  expect(measurements, `${route} 应可测量 AppShell/AppPage 边界`).not.toBeNull()
  expect(measurements?.documentHorizontalOverflow, `${route} 不得产生页面级横向滚动`).toBe(false)
  expect(measurements?.contentHorizontalOverflow, `${route} 不得撑宽 app-shell__content`).toBe(
    false,
  )
  expect(measurements?.contentVerticalOverflow, `${route} 的纵向滚动不得泄漏到内容区`).toBe(false)
  expect(measurements?.pageHorizontalOverflow, `${route} 的 AppPage 不得发生横向溢出`).toBe(false)
  expect(measurements?.pageInsideContent, `${route} 必须完全位于 app-shell__content 内`).toBe(true)
  expect(
    measurements?.appPageProbeScrollable,
    `${route} 的 AppPage 注入超高内容后必须形成纵向滚动`,
  ).toBe(true)
  expect(
    measurements?.appPageProbeScrollTop,
    `${route} 的 AppPage 必须保留短视口滚动兜底`,
  ).toBeGreaterThan(0)
  expect(
    measurements?.verticalScrollOwnerCount,
    `${route} 必须由 AppPage 或页面 Pattern 提供纵向滚动容器`,
  ).toBeGreaterThan(0)
  if (measurements?.appPageScrollMode === 'page') {
    expect(measurements.appPageOverflowY, `${route} 的普通长内容必须由 AppPage 滚动`).toBe('auto')
  }
}
