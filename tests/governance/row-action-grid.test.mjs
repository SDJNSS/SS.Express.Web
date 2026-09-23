import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'

const projectRoot = process.cwd()

function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.isFile() && entry.name.endsWith('.vue') ? [path] : []
  })
}

test('所有 DataTable 操作列统一使用三列紧凑 RowActionGrid', () => {
  const featureRoot = join(projectRoot, 'src', 'features')
  const actionTableFiles = vueFiles(featureRoot).filter((path) =>
    readFileSync(path, 'utf8').includes("slot: 'actions'"),
  )

  assert.ok(actionTableFiles.length > 0, '应至少发现一个 DataTable 操作列')
  for (const path of actionTableFiles) {
    const source = readFileSync(path, 'utf8')
    assert.match(source, /import RowActionGrid from '@shared\/components\/RowActionGrid\.vue'/)
    assert.match(source, /<RowActionGrid\b/)
  }

  const gridSource = readFileSync(
    join(projectRoot, 'src', 'shared', 'components', 'RowActionGrid.vue'),
    'utf8',
  )
  assert.match(gridSource, /grid-template-columns:\s*repeat\(3, max-content\)/)
  assert.match(gridSource, /row-gap:\s*var\(--spacing-1\)/)
})

test('用户与成员操作不再使用更多浮层且数据权限入口已搁置', () => {
  const source = readFileSync(
    join(
      projectRoot,
      'src',
      'features',
      'iam',
      'foundation',
      'components',
      'MembershipManagementPageView.vue',
    ),
    'utf8',
  )

  assert.doesNotMatch(source, /<el-dropdown\b/)
  assert.match(source, />角色与权限<\/el-button/)
  assert.doesNotMatch(source, />数据权限<\/el-button/)

  const roleSource = readFileSync(
    join(
      projectRoot,
      'src',
      'features',
      'iam',
      'access-control',
      'components',
      'RoleManagementPageView.vue',
    ),
    'utf8',
  )
  const memberPermissionSource = readFileSync(
    join(
      projectRoot,
      'src',
      'features',
      'iam',
      'access-control',
      'components',
      'MemberPermissionPageView.vue',
    ),
    'utf8',
  )
  const memberPermissionPage = readFileSync(
    join(
      projectRoot,
      'src',
      'features',
      'iam',
      'access-control',
      'pages',
      'MemberPermissionPage.vue',
    ),
    'utf8',
  )

  assert.doesNotMatch(roleSource, />数据权限<\/el-button/)
  assert.doesNotMatch(roleSource, />配置数据权限<\/el-button/)
  assert.doesNotMatch(memberPermissionSource, /name="data"/)
  assert.doesNotMatch(memberPermissionPage, /queryMemberDataPermissions/)
})
