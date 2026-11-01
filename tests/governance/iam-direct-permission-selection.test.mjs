import assert from 'node:assert/strict'
import test from 'node:test'
import {
  nestPermissionNodes,
  selectPermission,
} from '../../src/features/iam/permission-governance/adapters/permissionSelection.ts'

const node = (id, parent = null, auto = false, extras = {}) => ({
  id,
  permissionId: id,
  nodeKey: 'permission:' + id,
  nodeType: 'PERMISSION',
  parentPermissionId: parent,
  defaultSelectedWithParent: auto,
  appId: '1',
  appCode: 'IAM',
  appName: '员工管理',
  name: id,
  code: id,
  description: '',
  sourceGrants: [],
  status: 'ACTIVE',
  selectable: true,
  readOnly: false,
  children: [],
  ...extras,
})
const tree = () =>
  nestPermissionNodes([
    node('1'),
    node('2', '1', true),
    node('3', '2', true),
    node('4', '1'),
    node('5', '4', true),
    node('6', '1', true, { eligible: false }),
  ])

test('display nesting alone never changes explicit grants', () => {
  const nodes = tree(),
    saved = ['permission:1']
  assert.equal(nodes[0].children.length, 3)
  assert.deepEqual(saved, ['permission:1'])
})
test('active parent check follows continuous opt-in edges only', () => {
  const result = selectPermission(tree(), [], 'permission:1', true)
  assert.deepEqual(result.keys, ['permission:1', 'permission:2', 'permission:3'])
  assert.deepEqual(
    result.defaultAdded.map((n) => n.id),
    ['2', '3'],
  )
})
test('manual cancellation is allowed; parent remains explicitly granted', () => {
  const nodes = tree()
  const checked = selectPermission(nodes, [], 'permission:1', true).keys
  assert.deepEqual(selectPermission(nodes, checked, 'permission:2', false).keys, [
    'permission:1',
    'permission:3',
  ])
})
test('unchecking a parent preserves its descendants', () => {
  assert.deepEqual(
    selectPermission(tree(), ['permission:1', 'permission:2'], 'permission:1', false).keys,
    ['permission:2'],
  )
})
test('a child grant never selects its parent', () => {
  assert.deepEqual(selectPermission(tree(), [], 'permission:3', true).keys, ['permission:3'])
})
test('ungranted parent absent from effective results does not remove the child', () => {
  assert.equal(nestPermissionNodes([node('2', '1', true)])[0].id, '2')
})
test('group and Resource nodes never acquire grants', () => {
  for (const type of ['GROUP', 'RESOURCE'])
    assert.deepEqual(
      selectPermission(
        [node('10', null, false, { nodeType: type, selectable: false })],
        [],
        'permission:10',
        true,
      ).keys,
      [],
    )
})
test('inactive assigned Permission can be removed but not newly granted', () => {
  const nodes = [node('1', null, false, { status: 'DISABLED' })]
  assert.deepEqual(selectPermission(nodes, [], 'permission:1', true).keys, [])
  assert.deepEqual(selectPermission(nodes, ['permission:1'], 'permission:1', false).keys, [])
})
test('cyclic parent metadata fails closed, including Int64 string identities', () => {
  assert.throws(
    () => nestPermissionNodes([node('9007199254740993', '2'), node('2', '9007199254740993')]),
    /循环/,
  )
})
