import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const projectRoot = resolve(import.meta.dirname, '../..')

function source(path) {
  return readFileSync(resolve(projectRoot, path), 'utf8')
}

test('角色、SA 全局用户与 Tenant 成员 Function 页面复用同一个权限面板', () => {
  const roleView = source(
    'src/features/iam/access-control/components/RoleFunctionPermissionPageView.vue',
  )
  const userView = source(
    'src/features/iam/access-control/components/UserFunctionPermissionPageView.vue',
  )
  const memberView = source(
    'src/features/iam/access-control/components/MemberPermissionPageView.vue',
  )

  assert.match(roleView, /import FunctionPermissionPanel/u)
  assert.match(roleView, /<FunctionPermissionPanel/u)
  assert.match(userView, /import FunctionPermissionPanel/u)
  assert.match(userView, /<FunctionPermissionPanel/u)
  assert.match(memberView, /import FunctionPermissionPanel/u)
  assert.match(memberView, /<FunctionPermissionPanel/u)
})

test('共享权限面板不从 URL 或路由推断场景与能力', () => {
  const panel = source('src/features/iam/access-control/components/FunctionPermissionPanel.vue')

  for (const forbidden of ['useRoute', 'window.location', 'pathname', 'route.query']) {
    assert.equal(panel.includes(forbidden), false, `共享面板禁止包含 ${forbidden}`)
  }
  assert.match(panel, /subjectType:[^\n]*'role'/u)
  assert.match(panel, /subjectType:[^\n]*'user'/u)
  assert.match(panel, /subjectType:[^\n]*'member'/u)
  assert.match(panel, /canEdit: boolean/u)
  assert.match(panel, /props\.subjectType === 'role' && props\.canEdit/u)
})

test('角色 Function 页面可编辑，用户角色可维护但 Function 权限固定只读', () => {
  const rolePage = source('src/features/iam/access-control/pages/RoleFunctionPermissionPage.vue')
  const roleView = source(
    'src/features/iam/access-control/components/RoleFunctionPermissionPageView.vue',
  )
  const userView = source(
    'src/features/iam/access-control/components/UserFunctionPermissionPageView.vue',
  )
  const memberPage = source('src/features/iam/access-control/pages/MemberPermissionPage.vue')
  const memberView = source(
    'src/features/iam/access-control/components/MemberPermissionPageView.vue',
  )

  assert.match(rolePage, /useEffectivePermissions/u)
  assert.match(rolePage, /hasFunctionPermission/u)
  assert.match(rolePage, /IAM_PERMISSIONS\.roles\.saveFunctionPermissions/u)
  assert.match(rolePage, /:can-edit="canEdit"/u)
  assert.match(roleView, /subject-type="role"/u)
  assert.match(userView, /subject-type="user"/u)
  assert.match(userView, /:can-edit="false"/u)
  assert.equal(userView.includes('saveFunctionPermissions'), false)
  assert.match(memberView, /subject-type="member"/u)
  assert.match(memberView, /:can-edit="false"/u)
  assert.match(memberView, /IAM_PERMISSIONS\.members\.assignRole/u)
  assert.match(memberView, /IAM_PERMISSIONS\.members\.revokeRole/u)
  assert.match(memberPage, /accessControlApi\.assignRoles/u)
  assert.match(memberPage, /accessControlApi\.revokeRoles/u)
  assert.match(memberPage, /accessControlApi\.queryMemberFunctionPermissions/u)
  assert.equal(memberPage.includes('accessControlApi.queryUserFunctionPermissions'), false)
  assert.equal(memberPage.includes('saveFunctionPermissions'), false)
})
