import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import {
  validateDeclarationStates,
  declarationStatesReady,
} from '../../scripts/lib/iam-maintenance-model.mjs'
import { frontendResources } from '../../scripts/lib/iam-maintenance-manifest.mjs'
import {
  buildAuthorizationRollout,
  validateAuthorizationRollout,
} from '../../scripts/lib/iam-authorization-rollout.mjs'
import { readResourceRegistries } from '../../scripts/lib/resource-registries.mjs'
import { discoverRoutes } from '../../scripts/lib/iam-maintenance-source.mjs'

const state = {
  lifecycle: 'active',
  implementation_status: 'implemented',
  runtime_authorization_model: 'legacy',
}
const resource = { ...state, resource_code: 'IAM.PAGE', app_code: 'IAM', resource_type: 'menu' }
const permission = {
  ...state,
  permission_key: 'page.view',
  app_code: 'IAM',
  frontend_resource_code: 'IAM.PAGE',
}

test('declared Legacy resources can be maintained without claiming V2 runtime activation', () => {
  assert.equal(declarationStatesReady([resource], [permission]), true)
  assert.equal(resource.runtime_authorization_model, 'legacy')
})
test('mixed lifecycle and owner/template state contradictions fail closed', () => {
  assert.throws(
    () => validateDeclarationStates([{ ...resource, lifecycle: 'implemented' }]),
    /Invalid separated/,
  )
  assert.throws(
    () =>
      validateDeclarationStates([resource], [{ ...permission, runtime_authorization_model: 'v2' }]),
    /mismatch/,
  )
  const pending = { ...resource, implementation_status: 'pending-migration' }
  assert.equal(declarationStatesReady([pending]), false)
  assert.throws(
    () =>
      validateDeclarationStates(
        [pending],
        [{ ...permission, implementation_status: 'pending-migration' }],
      ),
    /unimplemented/,
  )
  assert.throws(
    () =>
      validateDeclarationStates([{ ...resource, runtime_authorization_model: 'not-applicable' }]),
    /runtime guard/,
  )
})
test('unregistered structural Module requires explicit policy, unknown resources are not promoted', () => {
  const catalog = {
    apps: [
      {
        app_code: 'IAM',
        modules: [
          { resource_code: 'IAM', resource_name: 'IAM', resource_type: 'module', status: 'active' },
        ],
      },
    ],
  }
  const policy = {
    structural_modules: [],
    unimplemented_resources: [],
    registered_resources: state,
  }
  assert.throws(() => frontendResources(catalog, [], policy, []), /Missing explicit/)
  const explicit = {
    ...policy,
    structural_modules: [
      {
        ...state,
        app_code: 'IAM',
        resource_code: 'IAM',
        reason: 'Declared structural parent',
        remarks: '用途：组织身份管理菜单；场景：还原导航分组，不授予后代权限。',
      },
    ],
  }
  const resources = frontendResources(catalog, [], explicit, [])
  assert.equal(resources[0].runtime_authorization_model, 'not-applicable')
  assert.equal(declarationStatesReady(resources), true)
  assert.throws(() => frontendResources({ apps: [] }, [], explicit, []), /Stale/)
})
test('rollout includes every registered Legacy/V2 page; editing phase cannot activate grants', () => {
  const root = process.cwd(),
    manifest = JSON.parse(readFileSync('artifacts/iam-maintenance.frontend.json', 'utf8'))
  const registry = readResourceRegistries(root)
  const pages = Array.isArray(registry) ? registry : registry.pages
  const rollout = buildAuthorizationRollout(root, {
    pages,
    routes: discoverRoutes(root),
    resources: manifest.resources,
  })
  assert.equal(rollout.runtime_activation_ready, false)
  assert.equal(rollout.legacy_routes.length + rollout.v2_code_routes.length, pages.length)
  assert.equal(rollout.blocked_route_count, rollout.legacy_routes.length)
  const contract = JSON.parse(readFileSync('standards/iam/authorization-rollout.json', 'utf8'))
  assert.throws(
    () => validateAuthorizationRollout({ ...contract, activation_switch: 'enabled' }, {}),
    /activation/,
  )
  assert.throws(
    () => validateAuthorizationRollout({ ...contract, legacy_v2_union: 'allowed' }, {}),
    /union/,
  )
  const altered = JSON.parse(JSON.stringify(contract))
  altered.pages[0].activation_allowed = true
  assert.throws(() => validateAuthorizationRollout(altered, {}), /activation transition/)
})
test('manifest Schema 3.0 accepts separated state and rejects old/missing rollout evidence', () => {
  const schema = JSON.parse(
    readFileSync('standards/schemas/iam-maintenance.frontend.schema.json', 'utf8'),
  )
  const manifest = JSON.parse(readFileSync('artifacts/iam-maintenance.frontend.json', 'utf8'))
  const validate = new Ajv2020({ strict: true }).compile(schema)
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors))
  assert.equal(validate({ ...manifest, meta: { ...manifest.meta, schema_version: '1.0' } }), false)
  const missing = JSON.parse(JSON.stringify(manifest))
  delete missing.authorization_rollout
  assert.equal(validate(missing), false)
})
