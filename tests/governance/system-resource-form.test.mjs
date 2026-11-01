import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emptySystemResourceForm,
  createSystemResourceRequest,
  updateSystemResourceRequest,
  resourceParentTypes,
} from '../../src/features/iam/permission-governance/adapters/systemResourceForm.ts'

test('resource forms are blank and manual creation delegates code generation to IAM', () => {
  const form = emptySystemResourceForm()
  assert.equal(form.resourceName, '')
  assert.equal(form.appId, '')
  assert.equal(form.parentId, undefined)
  const request = createSystemResourceRequest(
    { ...form, appId: '90071992547409931', resourceName: '新模块' },
    'request-create',
  )
  assert.equal(request.resource_code, '')
  assert.equal(request.app_id, '90071992547409931')
  assert.equal(request.parent_id, '0')
  assert.equal(request.source, 'frontend')
  assert.equal(request.is_visible, false)
  assert.equal(request.is_composable, false)
})

test('resource shape follows the actual backend hierarchy and never mixes API and route fields', () => {
  const value = {
    ...emptySystemResourceForm(),
    appId: '1',
    parentId: '90071992547409933',
    resourceName: '资源',
    routePath: '/iam/resource',
    component: 'iam/pages/Page',
    apiPath: '/iam-admin/Api/Read',
    functionAccessMode: 'read',
    isComposable: true,
  }
  for (const type of ['MODULE', 'MENU', 'BUTTON', 'BUTTON_PAGE', 'FUNCTION']) {
    const request = createSystemResourceRequest({ ...value, resourceType: type }, 'request-shape')
    assert.equal(request.source, type === 'FUNCTION' ? 'backend' : 'frontend')
    assert.equal(request.is_visible, type === 'MENU')
    assert.equal(request.api_path, type === 'FUNCTION' ? value.apiPath : '')
    assert.equal(request.http_method, type === 'FUNCTION' ? 'POST' : '')
    assert.equal(request.function_access_mode, type === 'FUNCTION' ? 'read' : null)
    assert.equal(request.route_path, ['MENU', 'BUTTON_PAGE'].includes(type) ? value.routePath : '')
    assert.equal(request.parent_id, ['MODULE', 'FUNCTION'].includes(type) ? '0' : value.parentId)
  }
  assert.deepEqual(resourceParentTypes('MENU'), ['MODULE'])
  assert.deepEqual(resourceParentTypes('BUTTON_PAGE'), ['MENU', 'BUTTON_PAGE'])
})

test('resource updates preserve authoritative identity and version without overwriting maintenance identity', () => {
  const source = {
    resourceId: '90071992547409935',
    appId: '90071992547409931',
    version: '63927767911469469',
    managedKey: 'stable-key',
  }
  const request = updateSystemResourceRequest(
    {
      ...emptySystemResourceForm(),
      appId: '99',
      resourceType: 'FUNCTION',
      resourceName: '修改名称',
      authorizationCategory: 'internal',
      isComposable: true,
      lifecycle: 'deprecated',
    },
    source,
    'same-request',
  )
  assert.equal(request.app_id, source.appId)
  assert.equal(request.id, source.resourceId)
  assert.equal(request.version, source.version)
  assert.equal(request.request_id, 'same-request')
  assert.equal(request.authorization_category, 'internal')
  assert.equal(request.is_composable, false)
  assert.equal(request.lifecycle, 'deprecated')
  for (const field of [
    'resource_code',
    'source',
    'resource_type',
    'managed_key',
    'definition_hash',
    'sync_run_id',
  ])
    assert.equal(Object.hasOwn(request, field), false)
})
