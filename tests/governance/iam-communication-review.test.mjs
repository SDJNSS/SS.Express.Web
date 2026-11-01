import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import {
  canonical,
  digest,
  scanSource,
  communicationDependencies,
  communicationDependencyHash,
  discoverCommunications,
  discoverRoutes,
} from '../../scripts/lib/iam-maintenance-source.mjs'
import { validateCommunicationInventory } from '../../scripts/lib/iam-communication-review.mjs'
import { validatePlaceholderEvidence } from '../../scripts/lib/iam-placeholder-review.mjs'
import {
  buildRouteCoverage,
  maintenanceComplete,
} from '../../scripts/lib/iam-maintenance-manifest.mjs'
import { functionIndex, resolveEndpoint } from '../../scripts/lib/iam-maintenance-model.mjs'

const functions = functionIndex(
  JSON.parse(readFileSync('standards/iam/backend-functions.snapshot.json', 'utf8')),
)
const structuredClone = (value) => JSON.parse(JSON.stringify(value))

function fixture() {
  const files = {
    'src/page.vue':
      '<script setup>onMounted(load)</script><template><button @click="save">Save</button></template>',
    'src/api.ts': 'export const save = () => requestApi({ url: "/dms/File/Upload" })',
  }
  const source = {
    sources: Object.entries(files).map(([file, text]) => ({ file, sha256: digest(text) })),
    candidates: Object.entries(files).flatMap(([file, text]) => scanSource(file, text).candidates),
    dependencies: { 'src/page.vue': ['src/api.ts'], 'src/api.ts': [] },
  }
  const endpoint = 'POST /dms/File/Upload'
  const chain = {
    chain_id: 'save',
    behavior: '保存触发上传并等待响应',
    callbacks: [{ file: 'src/api.ts', symbol: 'save' }],
    candidate_ids: source.candidates.map((c) => c.candidate_id),
    requests: [
      {
        candidate_id: source.candidates.find((c) => c.kind === 'request').candidate_id,
        endpoint,
        function_resource_code: resolveEndpoint(endpoint, functions).resource_code,
        function_sha256: digest(canonical(resolveEndpoint(endpoint, functions))),
      },
    ],
    dependencies: communicationDependencies(source, ['src/page.vue']),
    evidence: ['page.vue save → api.ts requestApi → DMS File/Upload'],
  }
  const inventory = {
    schema_version: '2.0',
    chains: [chain],
    sources: source.sources.map((item) => ({
      ...item,
      candidates_hash: digest(
        canonical(
          source.candidates
            .filter((c) => c.file === item.file)
            .map((c) => c.candidate_id)
            .sort(),
        ),
      ),
      status: 'reviewed',
      reason: '逐项审查测试证据',
      reviewed_by: 'test reviewer',
      evidence: ['测试夹具真实回调与请求链'],
      dependency_hash: communicationDependencyHash(source, [item.file]),
      candidate_reviews: [
        {
          candidate_ids: source.candidates
            .filter((c) => c.file === item.file)
            .map((c) => c.candidate_id),
          classification: 'business',
          reason: '当前精确上传调用',
          chain_ids: ['save'],
        },
      ],
    })),
  }
  return { source, inventory }
}

test('review requires exact candidate coverage, chain membership and authoritative Function mapping', () => {
  const { source, inventory } = fixture()
  assert.ok(
    validateCommunicationInventory(source, inventory, functions).every(
      (c) => c.review_status === 'reviewed',
    ),
  )
  const missing = structuredClone(inventory)
  missing.sources[0].candidate_reviews[0].candidate_ids.pop()
  assert.throws(() => validateCommunicationInventory(source, missing, functions), /Unclassified/)
  const repeated = structuredClone(inventory)
  repeated.sources[0].candidate_reviews.push(repeated.sources[0].candidate_reviews[0])
  assert.throws(
    () => validateCommunicationInventory(source, repeated, functions),
    /Duplicate candidate/,
  )
  const wrong = structuredClone(inventory)
  wrong.chains[0].requests[0].function_resource_code = 'invented'
  assert.throws(() => validateCommunicationInventory(source, wrong, functions), /Function mismatch/)
  const changedAuthority = new Map([...functions].map(([code, fn]) => [code, structuredClone(fn)]))
  const changedUpload = resolveEndpoint('POST /dms/File/Upload', changedAuthority)
  changedUpload.high_risk_permission_operation = !changedUpload.high_risk_permission_operation
  assert.throws(
    () => validateCommunicationInventory(source, inventory, changedAuthority),
    /Changed communication Function authority/,
  )
  const wrongCategory = structuredClone(inventory)
  wrongCategory.sources[0].candidate_reviews[0].classification = 'public'
  assert.throws(
    () => validateCommunicationInventory(source, wrongCategory, functions),
    /authoritative Function/,
  )
  const lostChain = structuredClone(inventory)
  lostChain.sources[0].candidate_reviews[0].chain_ids = ['missing']
  assert.throws(
    () => validateCommunicationInventory(source, lostChain, functions),
    /not covered by chain/,
  )
})

test('partial source reviews preserve pending candidates and cannot make the source complete', () => {
  const { source, inventory } = fixture()
  inventory.sources[0].status = 'pending'
  inventory.sources[0].candidate_reviews[0].candidate_ids.pop()
  const reviewed = validateCommunicationInventory(source, inventory, functions)
  assert.equal(reviewed.filter((c) => c.review_status === 'pending').length, 1)
  assert.equal(maintenanceComplete([{ status: 'registered' }], inventory, reviewed), false)
})

test('refreshing only the changed API record cannot preserve caller or chain approval', () => {
  const { source, inventory } = fixture()
  const changed = structuredClone(source)
  changed.sources[1].sha256 = digest('changed API implementation')
  const refreshed = structuredClone(inventory)
  refreshed.sources[1].sha256 = changed.sources[1].sha256
  refreshed.sources[1].dependency_hash = communicationDependencyHash(changed, ['src/api.ts'])
  assert.throws(
    () => validateCommunicationInventory(changed, refreshed, functions),
    /chain dependencies/,
  )
  refreshed.chains[0].dependencies = communicationDependencies(changed, ['src/page.vue'])
  assert.throws(
    () => validateCommunicationInventory(changed, refreshed, functions),
    /review dependencies/,
  )
})

test('inject aliases and providers outside static imports invalidate consumer evidence', () => {
  const files = {
    'src/consumer.ts': 'import { inject as receive } from "vue"; receive(fileTransferKey)',
    'src/provider.ts': 'app.provide(fileTransferKey, gateway)',
    'src/gateway.ts': 'export const gateway = {}',
  }
  const source = {
    sources: Object.entries(files).map(([file, text]) => ({ file, sha256: digest(text) })),
    candidates: Object.entries(files).flatMap(([file, text]) => scanSource(file, text).candidates),
    dependencies: { 'src/consumer.ts': [], 'src/provider.ts': ['src/gateway.ts'] },
  }
  assert.equal(source.candidates.filter((c) => c.kind === 'injection').length, 2)
  assert.ok(
    communicationDependencies(source, ['src/consumer.ts']).some((d) => d.file === 'src/gateway.ts'),
  )
  const previous = communicationDependencyHash(source, ['src/consumer.ts'])
  source.sources[2].sha256 = digest('new gateway')
  assert.notEqual(communicationDependencyHash(source, ['src/consumer.ts']), previous)
})

test('Element Plus callback props and imported production mjs cannot escape review', () => {
  const { candidates } = scanSource(
    'src/upload.vue',
    '<template><el-upload :on-change="upload" :on-remove="remove"/><el-drawer :before-close="close"/></template>',
  )
  assert.deepEqual(
    candidates.map((candidate) => candidate.expression),
    ['upload', 'remove', 'close'],
  )
  assert.equal(
    scanSource('src/export.ts', 'requestRaw({ responseType: "blob" })').candidates[0].kind,
    'request',
  )
  const source = discoverCommunications(process.cwd())
  assert.ok(source.sources.some((entry) => entry.file === 'src/shared/utils/tableText.mjs'))
  assert.ok(
    source.dependencies['src/shared/components/TableCellText.vue'].includes(
      'src/shared/utils/tableText.mjs',
    ),
  )
})

test('real eight placeholder routes are verified without disappearing from discovery', () => {
  const source = discoverCommunications(process.cwd())
  const routes = discoverRoutes(process.cwd())
  const migration = JSON.parse(readFileSync('standards/iam/maintenance-migration.json', 'utf8'))
  const evidence = JSON.parse(readFileSync('standards/iam/placeholder-evidence.json', 'utf8'))
  const verified = validatePlaceholderEvidence(routes, migration, evidence, source)
  assert.equal(verified.size, 8)
  const placeholderRoutes = routes.filter((route) => verified.has(route.route_path))
  const coverage = buildRouteCoverage(
    placeholderRoutes,
    [],
    { ...migration, pending_routes: [], auxiliary_routes: {} },
    verified,
  )
  assert.ok(coverage.every((route) => route.status === 'placeholder-verified'))
  assert.equal(maintenanceComplete(coverage, { sources: [{ status: 'reviewed' }] }, []), true)
  assert.equal(
    maintenanceComplete(coverage, { sources: [{ status: 'pending' }] }, []),
    false,
    'zero candidates is not a reviewed source',
  )
  const changed = structuredClone(source)
  changed.sources.find((item) => item.file.endsWith('/AppShell.vue')).sha256 =
    digest('changed provider')
  assert.throws(
    () => validatePlaceholderEvidence(routes, migration, evidence, changed),
    /source\/dependency evidence changed/,
  )
  const removedEvidence = structuredClone(evidence)
  removedEvidence.entries[0].candidate_reviews = []
  assert.throws(
    () => validatePlaceholderEvidence(routes, migration, removedEvidence, source),
    /Unclassified placeholder/,
  )
  const newRequest = structuredClone(source)
  newRequest.candidates.push({
    file: evidence.entries[0].component_file,
    kind: 'request',
    candidate_id: 'new-request',
  })
  assert.throws(
    () => validatePlaceholderEvidence(routes, migration, evidence, newRequest),
    /unresolved communication/,
  )
  const changedRoute = structuredClone(routes)
  changedRoute.find((route) => verified.has(route.route_path)).meta.implementationStatus =
    'implemented'
  assert.throws(
    () => validatePlaceholderEvidence(changedRoute, migration, evidence, source),
    /route evidence changed/,
  )
})
