import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { useAuthenticatedSession } from './helpers/authenticatedSession'

interface ApprovedPrototype {
  id: string
  name: string
  status: string
  productionRoute: string
  readyText: string
}

interface ApprovedPrototypeManifest {
  prototypes: ApprovedPrototype[]
}

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'UIDesign/approved-prototypes.json'), 'utf8'),
) as ApprovedPrototypeManifest

test.describe('approved prototype visual baselines', () => {
  for (const prototype of manifest.prototypes) {
    test(`${prototype.id} matches approved baseline`, async ({ page }, testInfo) => {
      await useAuthenticatedSession(page)
      const runtimeMessages: string[] = []
      page.on('pageerror', (error) => runtimeMessages.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          runtimeMessages.push(`${message.type()}: ${message.text()}`)
        }
      })

      expect(prototype.status).toBe('approved')
      await page.goto(prototype.productionRoute)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByText(prototype.readyText, { exact: false }).first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready.then(() => undefined))

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalOverflow).toBe(false)
      expect(runtimeMessages).toEqual([])

      await expect(page).toHaveScreenshot([prototype.id, `${testInfo.project.name}.png`], {
        fullPage: true,
      })
    })
  }
})
