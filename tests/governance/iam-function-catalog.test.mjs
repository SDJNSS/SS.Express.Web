import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateFunctionCatalog,
  validateFunctions,
  functionIndex,
} from '../../scripts/lib/iam-maintenance-model.mjs'
import { canonical, digest } from '../../scripts/lib/iam-maintenance-source.mjs'

function catalog() {
  return {
    schema_version: '3.0',
    scope: 'all-discovered-api-hosts',
    export_mode: 'offline-assembly-scan',
    hosts: [
      {
        service_code: 'iam-admin',
        route_prefix: 'iam-admin',
        assembly_name: 'IAM',
        build_version: '1.0',
        complete: true,
        function_count: 1,
      },
    ],
    functions: [
      {
        resource_code: 'IAM.RESOURCE.CREATE',
        resource_name: '创建资源',
        app_code: 'IAM',
        service_code: 'iam-admin',
        http_method: 'POST',
        api_path: '/iam-admin/PermissionResource/Create',
        function_access_mode: 'write',
        authorization_category: 'business',
        composable: true,
        high_risk_permission_operation: true,
        lifecycle: 'active',
      },
    ],
  }
}

test('schema 3 catalog needs no consumer allowlist and preserves high-risk declarations', () => {
  const input = catalog()
  validateFunctionCatalog(input)
  const snapshot = { functions: input.functions, content_hash: digest(canonical(input.functions)) }
  assert.equal(
    functionIndex(snapshot).get('IAM.RESOURCE.CREATE').high_risk_permission_operation,
    true,
  )
  input.functions[0].high_risk_permission_operation = false
  assert.throws(() => functionIndex(snapshot), /hash mismatch/)
})

test('unknown or legacy catalog schemas cannot be silently imported', () => {
  for (const version of ['1.0', '2.0', '4.0', undefined])
    assert.throws(
      () => validateFunctionCatalog({ ...catalog(), schema_version: version }),
      /schema/,
    )
})

test('host completeness, counts, identity and route coverage are checked before import', () => {
  for (const patch of [
    { complete: false },
    { function_count: 2 },
    { function_count: '1' },
    { build_version: '' },
    { route_prefix: '' },
  ]) {
    const input = catalog()
    Object.assign(input.hosts[0], patch)
    assert.throws(() => validateFunctionCatalog(input), /backend host/)
  }
  const duplicate = catalog()
  duplicate.hosts.push({ ...duplicate.hosts[0] })
  assert.throws(() => validateFunctionCatalog(duplicate), /backend host/)
  const missing = catalog()
  missing.functions[0].service_code = 'unlisted'
  missing.hosts[0].function_count = 0
  assert.throws(() => validateFunctionCatalog(missing), /undeclared backend host/)
  assert.throws(() => validateFunctionCatalog({ ...catalog(), hosts: [] }), /coverage/)
})

test('high-risk is a required boolean, not a truthy default; policy remains fail-closed', () => {
  for (const value of [undefined, null, 'false', 0]) {
    const input = catalog()
    input.functions[0].high_risk_permission_operation = value
    assert.throws(() => validateFunctions(input.functions), /Incomplete Function policy/)
  }
  const input = catalog()
  input.functions[0].authorization_category = 'restricted_automation'
  assert.throws(() => validateFunctions(input.functions), /Non-business/)
})

test('a declared Host may expose explicit absolute routes outside its convention prefix', () => {
  const input = catalog()
  input.functions[0].api_path = '/WeatherForecast'
  validateFunctionCatalog(input)
})
