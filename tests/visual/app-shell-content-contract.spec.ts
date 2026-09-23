import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { assertAppShellContentContract } from './helpers/assertAppShellContentContract'
import { useAuthenticatedSession } from './helpers/authenticatedSession'

const projectRoot = process.cwd()

function collectQuotedValues(source: string, property: string): string[] {
  const pattern = new RegExp(`\\b${property}:\\s*['"]([^'"]+)['"]`, 'gu')
  return [...source.matchAll(pattern)].map((match) => match[1] ?? '').filter(Boolean)
}

function collectProductionRoutes(): string[] {
  const subsystemConfig = readFileSync(resolve(projectRoot, 'src/app/config/subsystems.ts'), 'utf8')
  const routes = new Set([
    ...collectQuotedValues(subsystemConfig, 'home'),
    ...collectQuotedValues(subsystemConfig, 'to'),
  ])

  const featureRoot = resolve(projectRoot, 'src/features')
  for (const subsystem of readdirSync(featureRoot, { withFileTypes: true })) {
    if (!subsystem.isDirectory()) continue
    if (subsystem.name === 'reference') continue
    const routeFile = resolve(featureRoot, subsystem.name, 'routes.ts')
    try {
      const routeSource = readFileSync(routeFile, 'utf8')
      collectQuotedValues(routeSource, 'path').forEach((path) => routes.add(`/${path}`))
    } catch {
      // A subsystem may be preview-only and have no production route aggregator yet.
    }
  }

  const approvalManifest = JSON.parse(
    readFileSync(resolve(projectRoot, 'UIDesign/approved-prototypes.json'), 'utf8'),
  ) as { prototypes: Array<{ productionRoute: string }> }
  approvalManifest.prototypes.forEach(({ productionRoute }) => routes.add(productionRoute))

  routes.add('/route-that-does-not-exist')
  routes.delete('/login')
  routes.delete('/iam/select-tenant')
  return [...routes].sort()
}

const productionRoutes = collectProductionRoutes()

test.describe('AppShell content contract', () => {
  test('keeps every registered production page inside the shared content container', async ({
    page,
  }) => {
    await useAuthenticatedSession(page)
    await page.route('**/iam-admin/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [],
            total: 0,
            modules: [],
            menus: [],
            menu_tree: [],
            systems: [],
            resources: [],
            roles: [],
            domains: [],
            assignments: [],
          },
          is_success: true,
          status: 'success',
          message: '',
          code: 1,
        }),
      })
    })
    const runtimeMessages: string[] = []
    page.on('pageerror', (error) => runtimeMessages.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeMessages.push(`${message.type()}: ${message.text()}`)
      }
    })

    for (const route of productionRoutes) {
      await page.goto(route)
      await expect(page.locator('h1').first(), `${route} 应渲染页面标题`).toBeVisible()
      await assertAppShellContentContract(page, route)
    }

    expect(runtimeMessages).toEqual([])
  })
})
