import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import test from 'node:test'

import { discoverRoutes } from '../../scripts/lib/iam-maintenance-source.mjs'
import { readResourceRegistries } from '../../scripts/lib/resource-registries.mjs'

const catalog = JSON.parse(readFileSync('artifacts/iam-resource-catalog.json', 'utf8'))
const registries = readResourceRegistries(process.cwd())
const routes = discoverRoutes(process.cwd())

for (const appCode of ['IAM', 'TMS', 'VMS']) {
  test(`${appCode} Overview remains the visible first Menu of its default Module`, () => {
    const app = catalog.apps.find((item) => item.app_code === appCode)
    assert.ok(app, `${appCode}: App declaration missing`)
    const module = app.modules.find((item) => item.resource_code === appCode)
    assert.ok(module, `${appCode}: default Module missing`)
    assert.equal(module.resource_type, 'module')
    assert.equal(module.resource_name, app.app_name)
    const code = `${appCode}.OVERVIEW`
    const overview = module.menus.find((item) => item.resource_code === code)
    assert.ok(overview, `${code}: Overview must be a direct child of the default Module`)
    assert.equal(overview.source, 'frontend')
    assert.equal(overview.resource_type, 'menu')
    assert.equal(overview.is_visible, true)
    assert.equal(overview.sort_order, 1)
    assert.ok(
      module.menus.every((item) => item === overview || item.sort_order > 1),
      `${code}: no sibling may precede or tie the default entry`,
    )
    assert.equal(overview.route_path, `/${appCode.toLowerCase()}/overview`)
    const registry = registries.find((item) => item.resource_code === code)
    assert.ok(registry, `${code}: static registry missing`)
    assert.equal(registry.parent_resource_code, appCode)
    assert.equal(registry.resource_type, 'menu')
    assert.equal(registry.route_path, overview.route_path)
    assert.equal(registry.component, overview.component)
    const route = routes.find((item) => item.route_path === overview.route_path)
    assert.ok(route, `${code}: production route missing`)
    assert.equal(route.component_file, `src/features/${overview.component}.vue`)
    assert.equal(route.meta.resourceCode, code)
    assert.equal(route.meta.permission, overview.permission_code)
  })

  test(`${appCode} Overview does not invent statistics or grant AppShell Functions`, () => {
    const code = `${appCode}.OVERVIEW`
    const registry = registries.find((item) => item.resource_code === code)
    const permissions = registry.maintenance.permissions
    assert.equal(permissions.length, 1)
    assert.equal(permissions[0].permission_kind, 'frontend_only')
    assert.ok(permissions[0].local_only_reason)
    assert.deepEqual(registry.buttons, {})
    for (const element of Object.values(registry.elements))
      for (const endpoints of Object.values(element.events)) assert.deepEqual(endpoints, [])
    const app = catalog.apps.find((item) => item.app_code === appCode)
    const overview = app.modules
      .flatMap((module) => module.menus)
      .find((item) => item.resource_code === code)
    assert.deepEqual(overview.functions, [])
  })
}
