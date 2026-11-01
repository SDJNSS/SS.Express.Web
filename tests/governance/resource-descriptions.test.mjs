import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { readResourceRegistries } from '../../scripts/lib/resource-registries.mjs'
import { requireResourceDescription } from '../../scripts/lib/resource-descriptions.mjs'
import { bindResourceElements } from '../../src/shared/services/resourceElement.ts'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const pages = readResourceRegistries(process.cwd())
const definitions = new Map(
  pages.flatMap((page) =>
    [page, ...Object.values(page.buttons)].map((item) => [item.resource_code, item]),
  ),
)
const policy = readJson('standards/iam/resource-state-policy.json')
for (const module of policy.structural_modules) definitions.set(module.resource_code, module)

test('every maintained frontend resource has an authored purpose and usage scenario', () => {
  assert.equal(definitions.size, 108)
  assert.equal(definitions.has('IAM.MEMBERS.BUTTON.USER_STATUS'), false)
  for (const [code, resource] of definitions)
    assert.equal(requireResourceDescription(resource.remarks, code), resource.remarks)
  for (const code of ['IAM.OVERVIEW', 'TMS.OVERVIEW', 'VMS.OVERVIEW', 'DMS.DASHBOARD'])
    assert.match(definitions.get(code).remarks, /演示/)
})

test('missing, placeholder, ambiguous and overlong descriptions fail closed', () => {
  for (const value of [
    undefined,
    '',
    '查询',
    '用途：TODO；场景：待补充',
    '用途：查询；场景：' + '字'.repeat(401),
  ])
    assert.throws(() => requireResourceDescription(value, 'TEST'), /purpose and scenario/)
})

test('resource and element manifests preserve descriptions without inventing new resources', () => {
  const manifest = readJson('artifacts/iam-maintenance.frontend.json')
  assert.equal(manifest.resources.length, definitions.size)
  for (const resource of manifest.resources)
    assert.equal(resource.remarks, definitions.get(resource.resource_code).remarks)
  const elements = new Map(manifest.elements.map((element) => [element.resource_element, element]))
  for (const page of pages) {
    const bound = bindResourceElements(page)
    for (const [key, descriptor] of Object.entries(page.elements)) {
      const exported = elements.get(descriptor.resource_element)
      assert.equal(exported.remarks, bound[key].remarks)
      requireResourceDescription(exported.remarks, exported.resource_element)
      if (descriptor.target_resource_code) {
        assert.equal(exported.remarks, definitions.get(descriptor.target_resource_code).remarks)
        assert.equal(exported.frontend_resource_code, descriptor.target_resource_code)
      }
    }
  }
})

test('manifest schema requires nonempty remarks on resources and controls', () => {
  const validate = new Ajv2020({ strict: true }).compile(
    readJson('standards/schemas/iam-maintenance.frontend.schema.json'),
  )
  const manifest = readJson('artifacts/iam-maintenance.frontend.json')
  assert.equal(validate(manifest), true)
  const missingResource = JSON.parse(JSON.stringify(manifest))
  delete missingResource.resources[0].remarks
  assert.equal(validate(missingResource), false)
  const missingElement = JSON.parse(JSON.stringify(manifest))
  missingElement.elements[0].remarks = ''
  assert.equal(validate(missingElement), false)
})
