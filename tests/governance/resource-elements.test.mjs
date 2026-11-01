import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  buildResourceElements,
  inspectResourceMarkers,
} from '../../scripts/check-resource-elements.mjs'
import { parseResourceRegistry } from '../../scripts/lib/resource-registries.mjs'
import {
  bindResourceElements,
  resourceElementAttributes,
  resourceElementDirective,
} from '../../src/shared/services/resourceElement.ts'

const sample = {
  binding: 'groupElements',
  resource_code: 'IAM.GROUP',
  remarks: '用途：读取集团资料；场景：核对部署集团信息。',
  buttons: {
    edit: {
      resource_code: 'IAM.GROUP.BUTTON.EDIT',
      remarks: '用途：保存集团资料；场景：修订集团名称和联系方式。',
    },
  },
  elements: {
    page: { resource_element: 'iam.group.page', resource_key: 'page', kind: 'page', events: {} },
    edit: { resource_element: 'iam.group.edit', resource_key: 'edit', kind: 'action', events: {} },
  },
}

test('all 28 implemented production pages retain explicit resource and Button evidence', () => {
  const artifact = buildResourceElements()
  assert.deepEqual(
    artifact.pages.map((p) => p.route_path).sort(),
    [
      '/iam/group',
      '/iam/tenants',
      '/iam/organizations',
      '/iam/positions',
      '/iam/members',
      '/iam/roles',
      '/iam/dictionaries',
      '/iam/system-resources',
      '/iam/permissions',
      '/iam/permissions/configuration',
      '/iam/roles/authorization',
      '/iam/members/effective-permissions',
      '/iam/overview',
      '/iam/roles/assignments',
      '/iam/training/courses',
      '/iam/training/questions',
      '/iam/training/papers',
      '/iam/training/exams',
      '/iam/training/plans',
      '/iam/training/plans/:planId',
      '/iam/training/plans/:planId/tasks/:taskId',
      '/iam/training/overview',
      '/iam/training/employee-archives',
      '/iam/training/statistics',
      '/platform/dashboard',
      '/platform/welcome',
      '/tms/overview',
      '/vms/overview',
    ].sort(),
  )
  assert.equal(
    artifact.pages.reduce((n, p) => n + Object.keys(p.buttons).length, 0),
    75,
  )
  const permissions = artifact.pages.find((page) => page.route_path === '/iam/permissions')
  const catalog = artifact.pages.find((page) => page.route_path === '/iam/system-resources')
  assert.equal(catalog.buttons.create.resource_code, 'IAM.SYSTEM_RESOURCES.CREATE')
  assert.equal(catalog.buttons.edit.resource_code, 'IAM.SYSTEM_RESOURCES.UPDATE')
  assert.ok(
    catalog.elements.createForm.events.submit.includes('POST /iam-admin/PermissionResource/Create'),
  )
  assert.ok(
    catalog.elements.editForm.events.submit.includes('POST /iam-admin/PermissionResource/Update'),
  )
  assert.equal(permissions.buttons.edit.resource_code, 'IAM.PERMISSIONS.UPDATE')
  assert.deepEqual(permissions.elements.editForm.events.submit, [
    'POST /iam-admin/PermissionScheme/Update',
    'POST /iam-admin/PermissionApp/Query',
    'POST /iam-admin/PermissionScheme/Query',
  ])
  assert.equal(artifact.permission_template_ready, false)
  for (const page of artifact.pages) assert.equal(page.backend_function_mapping_complete, false)
})

test('marker discovery supports explicit shared props and conditional editor owners', () => {
  const source =
    '<template><AppPage :resource_element="groupElements.page"><el-button v-resource-element="groupElements.edit"/><FormDrawer :resource_element="editing ? groupElements.edit : groupElements.page"/></AppPage></template>'
  assert.equal(inspectResourceMarkers(source, 'view.vue', sample).length, 4)
})

for (const [name, source, message] of [
  ['missing marker', '<el-button @click="save"/>', /requires one/],
  ['unknown marker', '<el-button v-resource-element="groupElements.missing"/>', /unknown element/],
  [
    'dynamic marker',
    '<el-button v-resource-element="findResource(groupElements.edit)"/>',
    /dynamic\/unregistered/,
  ],
  ['missing drawer marker', '<FormDrawer @confirm="save"/>', /requires one/],
  [
    'directive on teleport root',
    '<el-dialog v-resource-element="groupElements.edit"/>',
    /teleport root/,
  ],
])
  test(`governance rejects ${name}`, () =>
    assert.throws(
      () => inspectResourceMarkers(`<template>${source}</template>`, 'view.vue', sample),
      message,
    ))

test('registry parsing is literal-only and never executes expressions', () => {
  const tail =
    ' as const; export const groupElements = bindResourceElements(resourceRegistry.group)'
  const source =
    'export const resourceRegistry = {group: { resource_code: "IAM.GROUP", elements: {} }}' + tail
  assert.equal(parseResourceRegistry(source)[0].binding, 'groupElements')
  assert.throws(
    () => parseResourceRegistry('export const resourceRegistry = {group: dangerous()}' + tail),
    /Non-literal/,
  )
  assert.throws(
    () => parseResourceRegistry('export const resourceRegistry = {group: {}, group: {}}' + tail),
    /Duplicate/,
  )
})

test('SDK resolves stable identifiers and directive updates/removes only metadata attributes', () => {
  const elements = bindResourceElements(sample)
  assert.equal(elements.edit.frontend_resource_code, 'IAM.GROUP.BUTTON.EDIT')
  assert.equal(elements.edit.owner_page_resource_code, 'IAM.GROUP')
  const attrs = new Map([['aria-disabled', 'true']])
  const host = { setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) }
  resourceElementDirective.mounted(host, { value: elements.edit })
  assert.equal(attrs.get('data-resource-element'), 'iam.group.edit')
  assert.equal(attrs.get('data-resource-description'), sample.buttons.edit.remarks)
  resourceElementDirective.updated(host, { value: elements.page })
  assert.equal(attrs.get('data-resource-code'), 'IAM.GROUP')
  assert.equal(attrs.get('data-resource-description'), sample.remarks)
  resourceElementDirective.updated(host, { value: undefined })
  assert.deepEqual([...attrs], [['aria-disabled', 'true']])
  assert.equal(resourceElementAttributes(elements.edit)['data-resource-owner'], 'IAM.GROUP')
})

test('metadata retrofit does not opt retained routes into V2 authorization', () => {
  const routes = readFileSync('src/features/iam/routes.ts', 'utf8')
  assert.equal((routes.match(/authorizationModel: 'v2'/g) ?? []).length, 6)
  for (const key of ['group', 'tenants', 'organizations', 'positions', 'members', 'roles']) {
    assert.ok(routes.includes(`permission: IAM_PERMISSIONS.${key}.view`))
    assert.ok(routes.includes(`.${key}.elements.page.resource_element`))
  }
})
