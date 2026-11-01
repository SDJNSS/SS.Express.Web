import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { checkIamRetirements } from '../../scripts/check-iam-retirements.mjs'
import {
  resolveHistoricalSource,
  canonicalContractSha256,
} from '../../scripts/check-page-contracts.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'iam-retirement-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  function put(path, data) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, typeof data === 'string' ? data : JSON.stringify(data))
  }
  put('standards/iam-retirements.json', {
    archive_root: 'archive/old',
    pages: [{ page_id: 'old', resource_code: 'OLD', route_path: '/iam/old' }],
    retired_components: ['iam/old/pages/OldPage'],
  })
  put('archive/old/docs/page-specs/old.yaml', 'archived')
  put(
    'UIDesign/src/prototype-registry.ts',
    "import Preview from '@feature-preview/training/operations-archive/public.preview'",
  )
  put('src/features/iam/routes.ts', 'export const routes = []')
  put('artifacts/iam-resource-catalog.json', {
    resources: [{ component: 'training/operations-archive/pages/TrainingPlanManagementPage' }],
  })
  return { root, put }
}

test('active repository excludes retired IAM routes, pages, previews and exports', () => {
  assert.deepEqual(checkIamRetirements().findings, [])
  const routes = readFileSync('src/features/iam/routes.ts', 'utf8')
  assert.equal((routes.match(/authorizationModel: 'v2'/gu) ?? []).length, 6)
  for (const route of ['iam/roles', 'iam/members', 'iam/roles/assignments'])
    assert.ok(routes.includes(`path: '${route}'`))
})

test('archive guard does not mistake the active training operations-archive Feature for history', (t) => {
  assert.deepEqual(checkIamRetirements(fixture(t).root).findings, [])
})

for (const [name, path, content] of [
  ['route', 'src/features/iam/routes.ts', "export const routes = [{ path: 'iam/old' }]"],
  ['preview', 'UIDesign/src/prototype-registry.ts', "export const entries = [{ id: 'old' }]"],
  ['component', 'src/features/iam/old/pages/OldPage.vue', '<template>old</template>'],
  [
    'import',
    'src/features/iam/public.ts',
    "export { default } from '../../../archive/old/Old.vue'",
  ],
  ['catalog', 'artifacts/iam-resource-catalog.json', '{"resources":[{"resource_code":"OLD"}]}'],
]) {
  test(`archive guard rejects revived ${name}`, (t) => {
    const { root, put } = fixture(t)
    put(path, content)
    assert.equal(checkIamRetirements(root).status, 'failed')
  })
}

test('source relocation only resolves byte-identical historical documents and never changes approval hash', (t) => {
  const { root, put } = fixture(t)
  const from = 'docs/page-specs/old.yaml'
  const to = 'archive/old/docs/page-specs/old.yaml'
  put('standards/source-relocations.json', {
    sources: [{ from, to, sha256: createHash('sha256').update('archived').digest('hex') }],
  })
  const contract = { sources: { references: [{ ref: from }] }, page: { revision: 1 } }
  const digest = canonicalContractSha256(contract)
  assert.equal(resolveHistoricalSource(root, from), to)
  assert.equal(canonicalContractSha256(contract), digest)
  put(to, 'semantic content changed')
  assert.equal(resolveHistoricalSource(root, from), from)
  assert.notEqual(canonicalContractSha256({ ...contract, page: { revision: 2 } }), digest)
  assert.equal(
    resolveHistoricalSource(root, 'src/features/iam/old/pages/OldPage.vue'),
    'src/features/iam/old/pages/OldPage.vue',
  )
})
