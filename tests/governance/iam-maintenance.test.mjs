import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import {
  buildMaintenanceManifest,
  buildRouteCoverage,
} from '../../scripts/lib/iam-maintenance-manifest.mjs'
import {
  validateTemplates,
  functionIndex,
  resolveEndpoint,
  validateFunctions,
} from '../../scripts/lib/iam-maintenance-model.mjs'
import {
  canonical,
  digest,
  discoverRoutes,
  excludedSource,
  scanSource,
} from '../../scripts/lib/iam-maintenance-source.mjs'
import { validateCommunicationInventory } from '../../scripts/lib/iam-communication-review.mjs'

const snapshot = JSON.parse(readFileSync('standards/iam/backend-functions.snapshot.json', 'utf8'))
const functions = functionIndex(snapshot)

test('production discovery is independent of the registered declarations', () => {
  const routes = discoverRoutes(process.cwd())
  assert.equal(routes.length, 42)
  assert.ok(routes.some((r) => r.route_path === '/iam/dictionaries'))
  assert.ok(routes.some((r) => r.route_path === '/iam/training/courses'))
  assert.ok(routes.some((r) => r.route_path === '/iam/training/employee-archives'))
  assert.ok(routes.some((r) => r.route_path === '/iam/roles/assignments'))
  assert.ok(!routes.some((r) => r.route_path.startsWith('/reference/')))
  assert.ok(!routes.some((r) => r.route_path === '/iam/application-resources'))
})

test('exact directory exclusions never hide operations-archive production feature', () => {
  assert.equal(
    excludedSource(
      'src/features/training/operations-archive/pages/EmployeeTrainingArchivePage.vue',
    ),
    false,
  )
  for (const path of [
    'archive/old.vue',
    'src/features/a/preview/p.vue',
    'src/a.fixture.ts',
    'src/features/reference/routes.ts',
  ])
    assert.equal(excludedSource(path), true)
})

test('scanner includes mount/watch, props callbacks, model events and dynamic routes/imports', () => {
  const { candidates } = scanSource(
    'src/example.vue',
    `<script setup lang="ts">
    onMounted(() => apiClient.load()); watch(value, () => requestApi({url: value}));
    router.addRoute(route); import(target);
    </script><template><PagedEntitySelect v-model="value" :load-options="load" @change="emit('change', $event)"/></template>`,
  )
  for (const kind of ['lifecycle', 'request', 'ui-event', 'dynamic-route', 'dynamic-import'])
    assert.ok(
      candidates.some((c) => c.kind === kind),
      kind,
    )
})

test('new route, lost resource guard and undeclared placeholder cannot silently pass', () => {
  const route = { route_path: '/x', component_file: 'src/features/x/Page.vue', meta: {} }
  const migration = { pending_routes: [], placeholder_routes: [], auxiliary_routes: {} }
  assert.throws(() => buildRouteCoverage([route], [], migration), /Unregistered production/)
  const page = {
    route_path: '/x',
    component: 'x/Page',
    resource_code: 'X.PAGE',
    authorization_model: 'v2',
    elements: { page: { resource_element: 'x.page' } },
  }
  assert.throws(() => buildRouteCoverage([route], [page], migration), /mismatch/)
  const markedRoute = {
    ...route,
    meta: { resourceCode: 'X.PAGE', resource_element: 'x.page' },
  }
  assert.throws(() => buildRouteCoverage([markedRoute], [page], migration), /resource guard/)
  assert.throws(
    () =>
      buildRouteCoverage([markedRoute], [{ ...page, authorization_model: 'legacy' }], migration),
    /resource guard/,
  )
  assert.throws(
    () => buildRouteCoverage([route], [], { ...migration, placeholder_routes: ['/x'] }),
    /Placeholder status/,
  )
})

test('unknown/mismatched Function and tampered catalog hashes fail closed', () => {
  assert.throws(() => resolveEndpoint('POST /iam-admin/Unknown/Query', functions), /Unknown/)
  assert.throws(() => resolveEndpoint('GET /dms/File/Upload', functions), /Unknown/)
  assert.throws(() => functionIndex({ ...snapshot, content_hash: 'bad' }), /hash mismatch/)
  assert.throws(
    () => validateFunctions([...snapshot.functions, snapshot.functions[0]]),
    /Duplicate/,
  )
})

function example() {
  const resources = [
    { app_code: 'IAM', resource_code: 'IAM', resource_type: 'module', parent_resource_code: '' },
    {
      app_code: 'IAM',
      resource_code: 'IAM.EXAMPLE',
      resource_type: 'menu',
      parent_resource_code: 'IAM',
    },
    {
      app_code: 'IAM',
      resource_code: 'IAM.EXAMPLE.SAVE',
      resource_type: 'button',
      parent_resource_code: 'IAM.EXAMPLE',
    },
  ]
  const upload = resolveEndpoint('POST /dms/File/Upload', functions)
  const permission = {
    app_code: 'IAM',
    permission_key: 'iam.example.save',
    parent_permission_key: null,
    default_selected_with_parent: false,
    frontend_resource_code: 'IAM.EXAMPLE.SAVE',
    permission_kind: 'business',
    function_resource_codes: [upload.resource_code],
  }
  return { resources, permission, upload }
}

test('DMS upload is explicitly composable across App and remains a write Button', () => {
  const { resources, permission, upload } = example()
  assert.equal(upload.function_access_mode, 'write')
  assert.equal(upload.authorization_category, 'business')
  assert.equal(upload.composable, true)
  validateTemplates(resources, [permission], functions)
  assert.throws(
    () =>
      validateTemplates(
        resources,
        [{ ...permission, frontend_resource_code: 'IAM.EXAMPLE' }],
        functions,
      ),
    /Write Function/,
  )
})

test('noncomposable cross-App, nonbusiness grants and Permission hierarchy violations are rejected', () => {
  const { resources, permission, upload } = example()
  const denied = new Map(functions).set(upload.resource_code, {
    ...upload,
    composable: false,
  })
  assert.throws(() => validateTemplates(resources, [permission], denied), /Noncomposable/)
  const selfService = snapshot.functions.find(
    (f) => f.authorization_category === 'session_self_service',
  )
  assert.throws(
    () =>
      validateTemplates(
        resources,
        [{ ...permission, function_resource_codes: [selfService.resource_code] }],
        functions,
      ),
    /Noncomposable/,
  )
})

test('frontend-only must be explicitly justified; invalid parent hierarchy is rejected', () => {
  const { resources, permission } = example()
  assert.throws(
    () =>
      validateTemplates(
        resources,
        [{ ...permission, permission_kind: 'frontend_only', function_resource_codes: [] }],
        functions,
      ),
    /Unproven frontend_only/,
  )
  assert.throws(
    () =>
      validateTemplates(
        [
          ...resources,
          { ...resources[2], resource_code: 'IAM.BAD', parent_resource_code: 'IAM.EXAMPLE.SAVE' },
        ],
        [permission],
        functions,
      ),
    /hierarchy/,
  )
})

test('new or changed source cannot be acknowledged by regenerating the output artifact', () => {
  const source = { sources: [{ file: 'src/a.ts', sha256: digest('a') }], candidates: [] }
  const inventory = {
    schema_version: '1.0',
    sources: [
      {
        ...source.sources[0],
        candidates_hash: digest(canonical([])),
        status: 'pending',
        reason: '待核实实际事件链',
      },
    ],
  }
  assert.deepEqual(validateCommunicationInventory(source, inventory), [])
  assert.throws(
    () =>
      validateCommunicationInventory(
        { ...source, sources: [{ file: 'src/a.ts', sha256: digest('new request') }] },
        inventory,
      ),
    /requires review/,
  )
  assert.throws(
    () =>
      validateCommunicationInventory(
        { ...source, candidates: [{ file: 'src/a.ts', candidate_id: 'new' }] },
        inventory,
      ),
    /scanner evidence changed/,
  )
  assert.throws(
    () =>
      validateCommunicationInventory(source, {
        ...inventory,
        sources: [{ ...inventory.sources[0], status: 'reviewed' }],
      }),
    /independent communication/,
  )
})

test('manifest is deterministic, schema-validated, and never mislabels partial coverage as sync-ready', () => {
  const manifest = buildMaintenanceManifest(process.cwd())
  const schema = JSON.parse(
    readFileSync('standards/schemas/iam-maintenance.frontend.schema.json', 'utf8'),
  )
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors))
  assert.equal(
    manifest.meta.content_hash,
    buildMaintenanceManifest(process.cwd()).meta.content_hash,
  )
  assert.equal(manifest.coverage.registered_routes, 28)
  assert.equal(manifest.coverage.pending_routes, 0)
  assert.equal(manifest.coverage.verified_placeholder_routes, 8)
  assert.equal(manifest.permission_templates.length, 103)
  assert.ok(
    !manifest.permission_templates.some((p) => p.permission_key === 'iam.members.user-status'),
  )
  for (const [key, write, otherWrite] of [
    ['iam.catalog.create', 'IAM.PERMISSION_RESOURCE.CREATE', 'IAM.PERMISSION_RESOURCE.UPDATE'],
    ['iam.catalog.update', 'IAM.PERMISSION_RESOURCE.UPDATE', 'IAM.PERMISSION_RESOURCE.CREATE'],
  ]) {
    const permission = manifest.permission_templates.find((p) => p.permission_key === key)
    assert.ok(permission.function_resource_codes.includes(write))
    assert.ok(permission.function_resource_codes.includes('IAM.PERMISSION_RESOURCE.QUERY'))
    assert.ok(!permission.function_resource_codes.includes(otherWrite))
  }
  assert.equal(manifest.meta.schema_version, '3.0')
  assert.equal(Object.hasOwn(manifest, 'package_templates'), false)
  for (const [key, unrelated] of [
    ['organization', 'IAM.ORGANIZATION.QUERY'],
    ['position', 'IAM.POSITION.QUERY'],
  ]) {
    const permission = manifest.permission_templates.find(
      (p) => p.permission_key === `iam.members.${key}`,
    )
    assert.ok(permission.function_resource_codes.includes('IAM.MEMBERSHIP.QUERY_FILTER_OPTIONS'))
    assert.ok(
      !permission.function_resource_codes.includes(unrelated),
      'relations use the scoped paged loader; full directory reads belong to creation only',
    )
  }
  for (const [key, endpoint] of [
    ['appoint-admin', 'IAM.MEMBER_ROLE.APPOINT_TENANT_ADMIN'],
    ['cancel-admin', 'IAM.MEMBER_ROLE.CANCEL_TENANT_ADMIN'],
    ['end-organization', 'IAM.MEMBERSHIP.END_ORGANIZATION'],
    ['end-position', 'IAM.MEMBERSHIP.END_POSITION'],
  ]) {
    const permission = manifest.permission_templates.find(
      (p) => p.permission_key === `iam.members.${key}`,
    )
    assert.deepEqual(
      permission.function_resource_codes.slice().sort(),
      ['IAM.MEMBERSHIP.QUERY_USERS', endpoint].sort(),
    )
  }
  if (manifest.coverage.pending_sources || manifest.coverage.unresolved_communications) {
    assert.equal(manifest.meta.complete, false)
    assert.equal(manifest.meta.ready_for_sync, false)
  }
  assert.equal(manifest.meta.runtime_verified, false)
  assert.equal(manifest.meta.database_verified, false)
  const revoke = manifest.permission_templates.find(
    (p) => p.permission_key === 'iam.members.revoke-role',
  )
  const assign = manifest.permission_templates.find(
    (p) => p.permission_key === 'iam.members.assign-role',
  )
  const roles = resolveEndpoint(
    'POST /iam-admin/RolePermission/QueryRoles',
    functions,
  ).resource_code
  assert.ok(
    !revoke.function_resource_codes.includes(roles),
    'conditional assign-only candidate refresh must not broaden revoke',
  )
  assert.ok(assign.function_resource_codes.includes(roles))
  assert.ok(
    manifest.resources.every((r) => r.resource_type !== 'function'),
    'legacy compatibility Functions must not become V2 frontend children',
  )
})
