import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'

import {
  DEFAULT_TABLE_CELL_MAX_CHARACTERS,
  splitTableCellGraphemes,
  truncateTableCellText,
} from '../../src/shared/utils/tableText.mjs'

const projectRoot = process.cwd()

test('表格文本默认按 20 个 Unicode 字素截断且不会拆开组合字符', () => {
  assert.equal(DEFAULT_TABLE_CELL_MAX_CHARACTERS, 20)
  assert.equal(splitTableCellGraphemes('e\u0301').length, 1)
  assert.equal(splitTableCellGraphemes('👩‍👩‍👧‍👦').length, 1)

  const twentyCharacters = truncateTableCellText('A'.repeat(20))
  assert.equal(twentyCharacters.displayText, 'A'.repeat(20))
  assert.equal(twentyCharacters.truncated, false)

  const twentyOneCharacters = truncateTableCellText('A'.repeat(21))
  assert.equal(twentyOneCharacters.displayText, `${'A'.repeat(20)}…`)
  assert.equal(twentyOneCharacters.fullText, 'A'.repeat(21))
  assert.equal(twentyOneCharacters.truncated, true)
})

test('表格文本允许列覆盖阈值或关闭逻辑截断', () => {
  assert.deepEqual(truncateTableCellText('ABCDE', 3), {
    fullText: 'ABCDE',
    displayText: 'ABC…',
    truncated: true,
  })
  assert.deepEqual(truncateTableCellText('ABCDE', false), {
    fullText: 'ABCDE',
    displayText: 'ABCDE',
    truncated: false,
  })
})

test('DataTable 默认文本列统一复用可访问的 TableCellText，slot 列保留自定义渲染', () => {
  const dataTableSource = readFileSync(
    join(projectRoot, 'src', 'shared', 'components', 'DataTable.vue'),
    'utf8',
  )
  const cellTextSource = readFileSync(
    join(projectRoot, 'src', 'shared', 'components', 'TableCellText.vue'),
    'utf8',
  )

  assert.match(dataTableSource, /import TableCellText from '\.\/TableCellText\.vue'/)
  assert.match(dataTableSource, /maxCharacters\?: number \| false/)
  assert.match(dataTableSource, /:show-overflow-tooltip="Boolean\(column\.slot\)"/)
  assert.match(dataTableSource, /<TableCellText/)
  assert.match(cellTextSource, /:tabindex="needsTooltip \? 0 : undefined"/)
  assert.match(cellTextSource, /:aria-label="needsTooltip \? truncation\.fullText : undefined"/)
  assert.match(cellTextSource, /ResizeObserver/)
})
