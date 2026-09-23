import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import { cwd } from 'node:process'
import test from 'node:test'

const projectRoot = cwd()

function collectVueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectVueFiles(path)
    return extname(entry.name) === '.vue' ? [path] : []
  })
}

test('ordinary ListPage tables use natural height and leave vertical scrolling to AppPage', () => {
  const dataTableSource = readFileSync(
    join(projectRoot, 'src', 'shared', 'components', 'DataTable.vue'),
    'utf8',
  )
  const listPageSource = readFileSync(
    join(projectRoot, 'src', 'shared', 'components', 'page-templates', 'ListPageTemplate.vue'),
    'utf8',
  )

  assert.match(dataTableSource, /scrollMode:\s*'page'/u)
  assert.doesNotMatch(dataTableSource, /height:\s*'100%'/u)
  assert.match(listPageSource, /scrollMode:\s*'page'/u)
  assert.match(
    listPageSource,
    /list-page-template--page[\s\S]*?overflow:\s*visible/u,
    'ListPage page 模式必须允许内容自然增高',
  )

  const featureFiles = collectVueFiles(join(projectRoot, 'src', 'features'))
  const ordinaryListPages = featureFiles.filter((file) => {
    const source = readFileSync(file, 'utf8')
    const tags = [...source.matchAll(/<ListPageTemplate\b[^>]*>/gu)].map((match) => match[0])
    return tags.some((tag) => !/scroll-mode=["']contained["']/u.test(tag))
  })

  assert.ok(ordinaryListPages.length > 0, '应至少发现一个普通 ListPage')

  for (const file of ordinaryListPages) {
    const source = readFileSync(file, 'utf8')
    const dataTableTags = [...source.matchAll(/<DataTable\b[^>]*>/gu)].map((match) => match[0])

    assert.doesNotMatch(
      source,
      /<AppPage\b[^>]*:scrollable=["']false["']/u,
      `${file} 的普通 ListPage 必须保留 AppPage 纵向滚动`,
    )
    for (const tag of dataTableTags) {
      assert.doesNotMatch(
        tag,
        /height=["']100%["']/u,
        `${file} 的普通列表 DataTable 不得占满固定高度形成内部纵向滚动`,
      )
    }
  }
})
