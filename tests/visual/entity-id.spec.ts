import { expect, test } from '@playwright/test'

import { sourceHost } from './helpers/testServers'

test.use({ baseURL: sourceHost })

test('preserves Int64 identity and never normalizes versions or opaque identifiers', async ({
  page,
}) => {
  await page.goto('/login')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/shared/utils/entityId.ts'
    const { canonicalEntityId, sameEntityId, compareEntityIds, normalizeEntityIdFields } =
      await import(/* @vite-ignore */ modulePath)
    const large = '9007199254740993'
    const normalized = normalizeEntityIdFields(
      {
        id: large,
        tenant_id: 3,
        version: '63927767911469468',
        request_id: '003',
        file_id: '9007199254740995',
        children: [{ id: 26, parent_id: null, role_ids: [1, '2'] }],
      },
      new Set(['id', 'tenant_id', 'parent_id', 'role_ids']),
    )
    const rejected = [
      Number.MAX_SAFE_INTEGER + 1,
      '1.5',
      true,
      '',
      '-1',
      '9223372036854775808',
    ].map((id) => {
      try {
        canonicalEntityId(id)
        return false
      } catch {
        return true
      }
    })
    return {
      normalized,
      rejected,
      same: sameEntityId('3', 3),
      distinct: sameEntityId('9007199254740992', large),
      order: compareEntityIds('9007199254740992', large),
    }
  })
  expect(result.normalized).toEqual({
    id: '9007199254740993',
    tenant_id: '3',
    version: '63927767911469468',
    request_id: '003',
    file_id: '9007199254740995',
    children: [{ id: '26', parent_id: null, role_ids: ['1', '2'] }],
  })
  expect(result.rejected.every(Boolean)).toBe(true)
  expect(result.same).toBe(true)
  expect(result.distinct).toBe(false)
  expect(result.order).toBe(-1)
})

test('accepts equivalent tenant IDs but still blocks different, missing and invalid tenants before network', async ({
  page,
}) => {
  let sent = 0
  await page.route('**/api/test/tenant-id', async (route) => {
    sent += 1
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code: 1, message: '', data: {} }),
    })
  })
  await page.goto('/login')
  const errors = await page.evaluate(async () => {
    const clientPath = '/src/shared/api/httpClient.ts'
    const sessionPath = '/src/shared/api/authSession.ts'
    const { requestApi } = await import(/* @vite-ignore */ clientPath)
    const { setStoredAuthSession } = await import(/* @vite-ignore */ sessionPath)
    setStoredAuthSession({
      accessToken: 'test-token',
      loginState: 'AUTHENTICATED',
      account: 'SA',
      currentTenantId: 3,
    })
    const failures: string[] = []
    for (const data of [
      { tenant_id: '3' },
      { tenant_ids: ['3'] },
      { tenant_id: 3 },
      { tenant_id: '4' },
      { tenant_ids: ['3', '4'] },
      { tenant_id: null },
      { tenant_id: '3.0' },
      { tenant_id: true },
    ]) {
      try {
        await requestApi({ url: '/test/tenant-id', method: 'POST', tenantScoped: true, data })
      } catch (error) {
        failures.push((error as Error).message)
      }
    }
    return failures
  })
  expect(sent).toBe(3)
  expect(errors).toHaveLength(5)
  expect(errors.every((message) => message.includes('租户'))).toBe(true)
})
