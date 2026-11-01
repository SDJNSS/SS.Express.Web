import { expect, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { previewHost } from './helpers/testServers'

test('对象名称是详情入口，操作列按可见内容收紧且最多三列', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text())
  })
  for (const [id, selector] of [
    ['iam-tenant-management', '.tenant-page__link'],
    ['iam-position-management', '.position-page__link'],
    ['iam-role-management', '.role-page__link'],
    ['iam-system-resource-catalog', '.resource-catalog-page__name'],
    ['iam-permission-scheme-management', '.permission-management-page__name'],
    ['training-course-management', '.training-page__link'],
    ['training-question-bank', '.training-page__link'],
    ['training-paper-management', '.training-page__link'],
    ['training-exam-configuration', '.training-page__link'],
    ['training-plan-management', '.training-operations-link'],
    ['training-employee-archives', '.training-operations-link'],
  ]) {
    await page.goto(`${previewHost}/?preview=${id}&capture=1`)
    await expect(page.locator(`[data-preview-id="${id}"]`)).toBeVisible()
    await expect(
      page.locator('.row-action-grid').getByRole('button', { name: '详情', exact: true }),
    ).toHaveCount(0)
    const row = page.locator('.el-table__body-wrapper tbody tr').first()
    const title = row.locator(`button${selector}`).first()
    await expect(title).toBeVisible()
    const titleText = (await title.innerText()).trim().split('\n')[0] ?? ''
    if (id === 'training-employee-archives') {
      await expect(page.getByRole('columnheader', { name: '操作', exact: true })).toHaveCount(0)
    } else {
      await expect
        .poll(async () =>
          page
            .locator('.el-table')
            .first()
            .evaluate((table) => {
              const grids = Array.from(
                table.querySelectorAll<HTMLElement>('td.data-table__actions .row-action-grid'),
              )
              const cell = table.querySelector<HTMLElement>('td.data-table__actions .cell')
              if (!cell || !grids.length) return false
              const style = getComputedStyle(cell)
              const widest = Math.max(...grids.map((grid) => grid.getBoundingClientRect().width))
              const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
              const width = cell.getBoundingClientRect().width
              return (
                width >= widest + padding &&
                width - widest - padding <= 3 &&
                grids.every((grid) => {
                  const styles = getComputedStyle(grid)
                  return (
                    styles.gridTemplateColumns.split(' ').length <= 3 && styles.rowGap === '0px'
                  )
                })
              )
            }),
        )
        .toBe(true)
    }
    if (
      [
        'iam-tenant-management',
        'iam-role-management',
        'training-plan-management',
        'training-employee-archives',
      ].includes(id)
    ) {
      await page.screenshot({
        path: join(tmpdir(), `ss-express-compact-${id}-${testInfo.project.name}.png`),
        animations: 'disabled',
      })
      if (id === 'iam-role-management') {
        await page
          .locator('.el-table')
          .first()
          .screenshot({
            path: join(tmpdir(), `ss-express-compact-row-actions-${testInfo.project.name}.png`),
            animations: 'disabled',
          })
      }
    }
    await title.focus()
    await page.keyboard.press('Enter')
    if (id === 'training-plan-management') {
      await expect(page.getByRole('heading', { name: '培训计划详情', exact: true })).toBeVisible()
    } else {
      await expect(page.locator('.el-drawer:visible')).toBeVisible()
      await expect(page.locator('.el-drawer:visible')).toContainText(titleText)
    }
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true)
  }
  expect(errors).toEqual([])
})

test('角色成员和计划任务的子列表也使用紧凑操作列', async ({ page }) => {
  for (const id of ['iam-role-assignments', 'training-plan-detail']) {
    await page.goto(`${previewHost}/?preview=${id}&capture=1`)
    const groups = page.locator('td.data-table__actions .row-action-grid')
    await expect(groups.first()).toBeAttached()
    await expect(page.getByRole('button', { name: '查看任务', exact: true })).toHaveCount(0)
    await expect
      .poll(() =>
        groups.evaluateAll((grids) =>
          grids
            .filter((grid) => grid.getClientRects().length)
            .every((grid) => {
              const cell = grid.closest<HTMLElement>('.cell')!
              const style = getComputedStyle(cell)
              const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
              return (
                columns <= 3 &&
                getComputedStyle(grid).rowGap === '0px' &&
                cell.getBoundingClientRect().width >=
                  grid.getBoundingClientRect().width +
                    parseFloat(style.paddingLeft) +
                    parseFloat(style.paddingRight)
              )
            }),
        ),
      )
      .toBe(true)
  }
})

test('员工保留详情；权限隐藏与恢复后重新计算列宽，不保留空轨道', async ({ page }) => {
  await page.goto(`${previewHost}/?preview=iam-membership-management&capture=1`)
  const table = page.locator('.el-table').first()
  await expect(table.getByRole('button', { name: '详情', exact: true }).first()).toBeVisible()
  const actionCell = table.locator('td.data-table__actions').first()
  const width = () => actionCell.evaluate((cell) => cell.getBoundingClientRect().width)
  await expect.poll(width).toBeGreaterThan(80)
  await expect.poll(width).toBeLessThan(120)
  const originalWidth = await width()
  await table.evaluate((root) => {
    root.querySelectorAll('.row-action-grid').forEach((grid) => {
      Array.from(grid.children)
        .slice(1)
        .forEach((child) => {
          const element = child as HTMLElement
          element.hidden = true
          element.style.setProperty('display', 'none', 'important')
        })
    })
  })
  await expect.poll(width).toBeLessThan(originalWidth - 20)
  const compactWidth = await width()
  await expect
    .poll(() =>
      table
        .locator('td.data-table__actions .row-action-grid')
        .first()
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
    )
    .toBe(1)
  await table.evaluate((root) => {
    root.querySelectorAll<HTMLElement>('.row-action-grid > [hidden]').forEach((element) => {
      element.hidden = false
      element.style.removeProperty('display')
    })
  })
  await expect.poll(width).toBeGreaterThan(compactWidth + 20)
  await expect
    .poll(() =>
      table
        .locator('td.data-table__actions .row-action-grid')
        .first()
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
    )
    .toBe(2)
  await table.getByRole('button', { name: '详情', exact: true }).first().click()
  await expect(page.locator('.el-drawer:visible')).toBeVisible()
})

test('无培训计划详情权限时仍保留计划名称文本', async ({ page }) => {
  await page.goto(`${previewHost}/?preview=training-plan-management&capture=1`)
  const row = page.locator('.el-table__body-wrapper tbody tr').first()
  const title = row.locator('button.training-operations-link')
  const name = await title.innerText()
  await title.evaluate((button) => {
    const element = button as HTMLElement
    element.hidden = true
    element.style.setProperty('display', 'none', 'important')
  })
  await expect(title).toBeHidden()
  await expect(row.locator('.training-plan-title-fallback')).toBeVisible()
  await expect(row.locator('.training-plan-title-fallback')).toHaveText(name)
})
