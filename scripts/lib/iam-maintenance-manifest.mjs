import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import Ajv2020 from 'ajv/dist/2020.js'
import { readResourceRegistries } from './resource-registries.mjs'
import { requireResourceDescription } from './resource-descriptions.mjs'
import { buildResourceElements } from '../check-resource-elements.mjs'
import {
  canonical,
  digest,
  discoverCommunications,
  discoverRoutes,
  communicationDependencies,
} from './iam-maintenance-source.mjs'
import {
  declarationStatesReady,
  functionIndex,
  resolveEndpoint,
  validateTemplates,
} from './iam-maintenance-model.mjs'
import { validateCommunicationInventory } from './iam-communication-review.mjs'
import { validatePlaceholderEvidence } from './iam-placeholder-review.mjs'
import {
  AUTHORIZATION_ROLLOUT_FILE,
  buildAuthorizationRollout,
} from './iam-authorization-rollout.mjs'

const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'))
const sortBy = (items, key) => items.sort((a, b) => a[key].localeCompare(b[key], 'en'))
const statePolicyFile = 'standards/iam/resource-state-policy.json'
const excluded = [
  {
    path_rule: 'archive/**, **/archive/**',
    reason: '明确退役代码，不作为生产源；独立路径段，不匹配 operations-archive。',
  },
  {
    path_rule: 'UIDesign/**, **/preview/**, **/public.preview.*, **/fixtures/**, **/*.fixture.*',
    reason: '原型或样本，不是独立生产资源。',
  },
  {
    path_rule: '**/reference/**',
    reason: 'Reference 路由仅在 DEV 注册；生产模式静态解析为不注册。',
  },
  {
    path_rule: 'tests/**, **/*.spec.*, **/*.test.*, node_modules/**, dist/**',
    reason: '测试、依赖和构建产物。',
  },
]

export function maintenanceComplete(routes, inventory, communications) {
  return (
    routes.every((route) =>
      ['registered', 'auxiliary', 'placeholder-verified'].includes(route.status),
    ) &&
    inventory.sources.every((entry) => entry.status === 'reviewed') &&
    communications.every((candidate) => candidate.review_status === 'reviewed')
  )
}

export function buildRouteCoverage(routes, pages, migration, verifiedPlaceholders = new Map()) {
  const pending = new Set(migration.pending_routes)
  const placeholders = new Set(migration.placeholder_routes)
  const seen = new Set()
  const result = routes.map((route) => {
    seen.add(route.route_path)
    const page = pages.find((p) => p.route_path === route.route_path)
    let status, reason
    if (page) {
      if (route.meta.implementationStatus === 'placeholder')
        throw new Error(`Registered resource cannot use a placeholder route: ${route.route_path}`)
      if (
        route.component_file !== `src/features/${page.component}.vue` ||
        route.meta.resourceCode !== page.resource_code ||
        route.meta.resource_element !== page.elements.page.resource_element
      )
        throw new Error(`Production route/registry mismatch: ${route.route_path}`)
      if (
        page.authorization_model === 'v2'
          ? route.meta.authorizationModel !== 'v2' || Boolean(route.meta.permission)
          : page.authorization_model !== 'legacy' ||
            route.meta.authorizationModel === 'v2' ||
            !route.meta.permission
      )
        throw new Error(`Missing/changed resource guard: ${route.route_path}`)
      status = 'registered'
      reason = '已登记静态资源及元素；通信审查状态另列，不等于全量就绪。'
    } else if (migration.auxiliary_routes[route.route_path]) {
      status = 'auxiliary'
      reason = migration.auxiliary_routes[route.route_path]
    } else if (placeholders.has(route.route_path)) {
      if (route.meta.implementationStatus !== 'placeholder')
        throw new Error(`Placeholder status changed: ${route.route_path}`)
      status = verifiedPlaceholders.has(route.route_path)
        ? 'placeholder-verified'
        : 'placeholder-pending-evidence'
      reason = verifiedPlaceholders.has(route.route_path)
        ? `纯占位证据已核验：${verifiedPlaceholders.get(route.route_path)}；Shell 及共享通信仍单独审查。`
        : '保留开发中入口；占位依赖中的通信仍扫描，不能仅根据 meta 豁免。'
    } else if (pending.has(route.route_path)) {
      status = 'pending-migration'
      reason = '正式生产入口待补完整元素/通信/模板声明；不排除、不退役。'
    } else
      throw new Error(
        `Unregistered production route: ${route.route_path} (${route.component_file})`,
      )
    return {
      ...route,
      status,
      reason,
      resource_code: page?.resource_code ?? route.meta.resourceCode ?? '',
      registry_file: page?.registry_file ?? '',
      authorization_model:
        route.meta.authorizationModel === 'v2'
          ? 'v2'
          : route.meta.permission
            ? 'legacy'
            : 'auxiliary',
    }
  })
  for (const page of pages)
    if (!seen.has(page.route_path))
      throw new Error(`Registry has no production route: ${page.resource_code}`)
  for (const path of [...pending, ...placeholders, ...Object.keys(migration.auxiliary_routes)])
    if (!seen.has(path)) throw new Error(`Stale migration entry (review retirement): ${path}`)
  return result
}

export function frontendResources(catalog, pages, policy, routes) {
  const resources = []
  const registered = new Map(
    pages.flatMap((page) => [
      [page.resource_code, { page, definition: page, kind: 'registered-page' }],
      ...Object.values(page.buttons).map((button) => [
        button.resource_code,
        { page, definition: button, kind: 'registered-button' },
      ]),
    ]),
  )
  const explicit = new Map()
  for (const [kind, declarations] of [
    ['structural-module', policy.structural_modules],
    ['unimplemented-declaration', policy.unimplemented_resources],
  ])
    for (const declaration of declarations) {
      if (explicit.has(declaration.resource_code) || registered.has(declaration.resource_code))
        throw new Error(`Conflicting resource state declaration: ${declaration.resource_code}`)
      explicit.set(declaration.resource_code, { declaration, kind })
    }
  const used = new Set()
  for (const app of catalog.apps) {
    function visit(item, parent = '') {
      // V1 Function/page records are not silently converted into V2 frontend resources.
      if (item.resource_type === 'function' || item.resource_type === 'page') return
      const owner = registered.get(item.resource_code)
      const explicitState = explicit.get(item.resource_code)
      let state
      if (owner) {
        if (
          !routes.some(
            (route) => route.route_path === owner.page.route_path && route.status === 'registered',
          )
        )
          throw new Error(
            `Resource state lacks a registered production route: ${item.resource_code}`,
          )
        state = {
          lifecycle: policy.registered_resources.lifecycle,
          implementation_status: policy.registered_resources.implementation_status,
          runtime_authorization_model: owner.page.authorization_model,
          source_file: owner.page.registry_file,
          state_source: {
            kind: owner.kind,
            file: owner.page.registry_file,
            reason: policy.registered_resources.reason,
          },
        }
      } else if (explicitState) {
        const { declaration, kind } = explicitState
        if (
          declaration.app_code !== app.app_code ||
          (kind === 'structural-module'
            ? item.resource_type !== 'module' ||
              Boolean(parent) ||
              item.route_path ||
              item.component
            : item.resource_type !== declaration.resource_type)
        )
          throw new Error(`Resource state declaration mismatch: ${item.resource_code}`)
        used.add(item.resource_code)
        state = {
          lifecycle: declaration.lifecycle,
          implementation_status: declaration.implementation_status,
          runtime_authorization_model: 'not-applicable',
          source_file: declaration.source_file ?? statePolicyFile,
          state_source: { kind, file: statePolicyFile, reason: declaration.reason },
        }
      } else {
        throw new Error(`Missing explicit resource state declaration: ${item.resource_code}`)
      }
      resources.push({
        app_code: app.app_code,
        resource_code: item.resource_code,
        resource_name: item.resource_name,
        remarks: requireResourceDescription(
          owner?.definition.remarks ?? explicitState?.declaration.remarks,
          item.resource_code,
        ),
        source: 'frontend',
        resource_type: item.resource_type,
        parent_resource_code: parent,
        route_path: item.route_path ?? '',
        component: item.component ?? '',
        is_visible: item.is_visible,
        sort_order: item.sort_order,
        status: item.status === 'active' ? 'active' : 'inactive',
        ...state,
      })
      for (const key of ['menus', 'pages', 'buttons'])
        for (const child of item[key] ?? []) visit(child, item.resource_code)
    }
    for (const module of app.modules) visit(module)
  }
  for (const code of explicit.keys())
    if (!used.has(code)) throw new Error(`Stale resource state declaration: ${code}`)
  return sortBy(resources, 'resource_code')
}

export function buildMaintenanceManifest(root) {
  const source = discoverCommunications(root)
  const inventory = readJson(root, 'standards/iam/communication-inventory.json')
  const catalog = readJson(root, 'artifacts/iam-resource-catalog.json')
  const snapshot = readJson(root, 'standards/iam/backend-functions.snapshot.json')
  const functions = functionIndex(snapshot)
  const pendingCommunications = validateCommunicationInventory(source, inventory, functions)
  const sourceReviews = new Map(inventory.sources.map((s) => [s.file, s]))
  const migration = readJson(root, 'standards/iam/maintenance-migration.json')
  const discoveredRoutes = discoverRoutes(root)
  const verifiedPlaceholders = validatePlaceholderEvidence(
    discoveredRoutes,
    migration,
    readJson(root, 'standards/iam/placeholder-evidence.json'),
    source,
  )
  const pages = readResourceRegistries(root)
  const marked = buildResourceElements(root)
  const routes = buildRouteCoverage(discoveredRoutes, pages, migration, verifiedPlaceholders)
  const statePolicy = readJson(root, statePolicyFile)
  const validateStatePolicy = new Ajv2020({ allErrors: true, strict: true }).compile(
    readJson(root, 'standards/schemas/iam-resource-state-policy.schema.json'),
  )
  if (!validateStatePolicy(statePolicy))
    throw new Error(`Invalid resource state policy: ${JSON.stringify(validateStatePolicy.errors)}`)
  const resources = frontendResources(catalog, pages, statePolicy, routes)
  const elements = []
  const permissionTemplates = []
  for (const page of pages) {
    const resource = resources.find((r) => r.resource_code === page.resource_code)
    if (!resource) throw new Error(`Missing frontend resource: ${page.resource_code}`)
    for (const [key, descriptor] of Object.entries(page.elements)) {
      const code =
        descriptor.target_resource_code ??
        (descriptor.resource_key === 'page'
          ? page.resource_code
          : page.buttons[descriptor.resource_key]?.resource_code)
      const events = Object.entries(descriptor.events).map(([event, endpoints]) => ({
        event,
        functions: endpoints.map((api) => {
          const fn = resolveEndpoint(api, functions)
          return {
            resource_code: fn.resource_code,
            service_code: fn.service_code,
            endpoint: api,
            authorization_category: fn.authorization_category,
          }
        }),
      }))
      elements.push({
        resource_element: descriptor.resource_element,
        owner_page_resource_code: page.resource_code,
        frontend_resource_code: code,
        permission_key:
          page.maintenance?.permissions?.find((p) => p.element_keys.includes(key))
            ?.permission_key ?? '',
        kind: descriptor.kind,
        remarks: requireResourceDescription(
          descriptor.remarks ?? resources.find((item) => item.resource_code === code)?.remarks,
          descriptor.resource_element,
        ),
        events,
        source_file: page.registry_file,
        evidence:
          marked.pages
            .find((p) => p.page_id === page.page_id)
            ?.evidence.filter((e) => e.resource_element === descriptor.resource_element) ?? [],
      })
    }
    for (const permission of page.maintenance?.permissions ?? []) {
      const rootCode =
        permission.resource_key === 'page'
          ? page.resource_code
          : page.buttons[permission.resource_key]?.resource_code
      const permissionRoot = resources.find((item) => item.resource_code === rootCode)
      if (!permissionRoot) throw new Error(`Missing Permission resource: ${rootCode}`)
      const apis = permission.element_keys.flatMap((key) => {
        const element = page.elements[key]
        if (
          !element ||
          element.resource_key !== permission.resource_key ||
          element.target_resource_code
        )
          throw new Error(
            `Permission element ownership mismatch: ${permission.permission_key} -> ${key}`,
          )
        return Object.values(element.events).flat()
      })
      const functionCodes = [
        ...new Set(
          apis
            .map((api) => resolveEndpoint(api, functions))
            .filter((fn) => fn.authorization_category === 'business')
            .map((fn) => fn.resource_code),
        ),
      ].sort()
      // Endpoint -> code is an exact authoritative lookup, never name-based inference.
      // Permission members and their owned elements are explicitly declared by the Feature.
      permissionTemplates.push({
        app_code: resource.app_code,
        permission_key: permission.permission_key,
        parent_permission_key: permission.parent_permission_key ?? null,
        default_selected_with_parent: permission.default_selected_with_parent ?? false,
        permission_name: permission.permission_name,
        frontend_resource_code: rootCode,
        permission_kind: permission.permission_kind,
        function_resource_codes: functionCodes,
        local_only_reason: permission.local_only_reason ?? '',
        status: 'active',
        lifecycle: permissionRoot.lifecycle,
        implementation_status: permissionRoot.implementation_status,
        runtime_authorization_model: permissionRoot.runtime_authorization_model,
        source_file: page.registry_file,
        communication_review_complete: communicationDependencies(source, [
          `src/features/${page.component}.vue`,
        ]).every(({ file }) => sourceReviews.get(file)?.status === 'reviewed'),
      })
    }
  }
  validateTemplates(resources, permissionTemplates, functions)
  const statesReady = declarationStatesReady(resources, permissionTemplates)
  const authorizationRollout = buildAuthorizationRollout(root, {
    pages,
    routes: discoveredRoutes,
    resources,
  })
  const retirements = readJson(root, 'standards/iam-retirements.json')
  const sourceInputs = [
    ...source.sources,
    ...[
      'standards/iam/backend-functions.snapshot.json',
      'standards/iam/maintenance-migration.json',
      'standards/iam/communication-inventory.json',
      'standards/iam/placeholder-evidence.json',
      statePolicyFile,
      AUTHORIZATION_ROLLOUT_FILE,
      'standards/iam-retirements.json',
      'scripts/generate-resource-catalog.mjs',
      'scripts/check-resource-elements.mjs',
      'scripts/generate-iam-maintenance.mjs',
      'scripts/lib/resource-registries.mjs',
      'scripts/lib/resource-descriptions.mjs',
      'scripts/lib/iam-maintenance-source.mjs',
      'scripts/lib/iam-maintenance-model.mjs',
      'scripts/lib/iam-authorization-rollout.mjs',
      'scripts/lib/iam-maintenance-manifest.mjs',
      'scripts/lib/iam-communication-review.mjs',
      'scripts/lib/iam-placeholder-review.mjs',
      'standards/schemas/iam-communication-inventory.v2.schema.json',
      'standards/schemas/iam-maintenance.frontend.schema.json',
      'standards/schemas/iam-resource-state-policy.schema.json',
    ].map((file) => ({
      file,
      sha256: digest(readFileSync(join(root, file), 'utf8').replace(/\r\n/gu, '\n')),
    })),
  ].sort((a, b) => a.file.localeCompare(b.file, 'en'))
  const result = {
    meta: {
      schema_version: '3.0',
      resource_state_policy: statePolicyFile,
      authorization_model: 'v2',
      source_revision: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      build: 'source-worktree',
      source_content_hash: digest(canonical(sourceInputs)),
      content_hash: '',
      scope: {
        environment: 'production',
        discovery: 'all-web-source',
        apps: catalog.apps.map((a) => a.app_code).sort(),
      },
      complete: maintenanceComplete(routes, inventory, pendingCommunications),
      ready_for_sync: false,
      runtime_verified: false,
      database_verified: false,
      exclusions: excluded,
    },
    apps: catalog.apps.map((app) => ({
      app_code: app.app_code,
      app_name: app.app_name,
      route_prefix: app.route_prefix,
      default_module_resource_code: app.app_code,
    })),
    resources,
    authorization_rollout: authorizationRollout,
    elements: sortBy(elements, 'resource_element'),
    permission_templates: sortBy(permissionTemplates, 'permission_key'),
    retirements: retirements.pages.map((page) => ({
      page_id: page.page_id,
      resource_code: page.resource_code,
      route_path: page.route_path,
      replacement_route: page.replacement_route,
      lifecycle: page.lifecycle,
      expected_handling: page.expected_handling,
      retired_version: page.retired_at ?? retirements.retired_at,
    })),
    backend_source: {
      ...snapshot.provenance,
      content_hash: snapshot.content_hash,
      function_count: functions.size,
    },
    coverage: {
      production_routes: routes.length,
      registered_routes: routes.filter((r) => r.status === 'registered').length,
      pending_routes: routes.filter((r) => r.status === 'pending-migration').length,
      verified_placeholder_routes: verifiedPlaceholders.size,
      reviewed_sources: inventory.sources.filter((entry) => entry.status === 'reviewed').length,
      pending_sources: inventory.sources.filter((entry) => entry.status === 'pending').length,
      communication_candidates: source.candidates.length,
      reviewed_communications: pendingCommunications.filter((c) => c.review_status === 'reviewed')
        .length,
      unresolved_communications: pendingCommunications.filter((c) => c.review_status === 'pending')
        .length,
      routes,
      communications: pendingCommunications,
      communication_chains: inventory.chains ?? [],
      source_inputs: sourceInputs,
      notes: [
        '通信候选含本地事件、共享回调及未调用 API，不将候选数量等同真实请求数。尚未逐项证明的链保留 pending。',
        '模板为静态声明；不得以 exact endpoint 映射成功代替通信链完整性或在线授权验收。',
        '旧 meta.permission/v-permission 仍按原逻辑运行，本清单不迁移运行时鉴权。',
        'lifecycle 表达资源维护生命期；implementation_status 表达实现声明成熟度；runtime_authorization_model 独立表明页面守卫。implemented 与离线 ready 均不证明 V2 已上线。',
      ],
    },
  }
  result.meta.ready_for_sync =
    result.meta.complete &&
    statesReady &&
    permissionTemplates.every((p) => p.communication_review_complete)
  result.meta.content_hash = digest(
    canonical({ ...result, meta: { ...result.meta, content_hash: '', source_revision: '' } }),
  )
  return result
}
