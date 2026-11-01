import assert from 'node:assert/strict'
import test from 'node:test'
import {
  emptyItem,
  itemPayload,
  validCode,
  validateInitialItems,
} from '../../src/features/iam/dictionaries/adapters/dictionaryForms.ts'

test('dictionary stable keys trim, reject whitespace/control and compare initial keys case-insensitively', () => {
  assert.equal(validCode(' TRANSPORT_MODE '), 'TRANSPORT_MODE')
  for (const code of ['', 'a b', 'a\nb', 'a\u0001b', 'a\u007fb', 'a'.repeat(101)])
    assert.throws(() => validCode(code))
  const value = itemPayload({ ...emptyItem(), item_code: 'First', item_name: '第一项' })
  assert.throws(() => validateInitialItems([value, { ...value, item_code: 'first' }]), /重复/)
  assert.throws(
    () =>
      validateInitialItems(
        Array.from({ length: 201 }, (_, i) => ({ ...value, item_code: `ITEM_${i}` })),
      ),
    /200/,
  )
})
test('dictionary JSON preserves scalars and counts actual UTF-8 bytes; null status needs a deliberate choice', () => {
  const form = { ...emptyItem(), item_code: 'FIRST', item_name: '第一项' }
  for (const [json, expected] of [
    ['false', false],
    ['0', 0],
    ['""', ''],
    ['null', null],
    ['', null],
  ]) {
    assert.deepEqual(itemPayload({ ...form, json }).ext_data, expected)
  }
  assert.throws(() => itemPayload({ ...form, json: '{invalid}' }), /JSON/)
  assert.throws(() => itemPayload({ ...form, json: JSON.stringify('汉'.repeat(6000)) }), /16 KiB/)
  assert.throws(() => itemPayload({ ...form, status: '' }), /未设置/)
  assert.throws(() => itemPayload({ ...form, sort_no: -1 }), /int32/)
  assert.throws(() => itemPayload({ ...form, sort_no: 0.5 }), /int32/)
  assert.throws(() => itemPayload({ ...form, sort_no: 2147483648 }), /int32/)
  assert.equal(itemPayload({ ...form, item_color: '<script>' }).item_color, '<script>')
})
