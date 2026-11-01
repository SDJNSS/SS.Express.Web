import { canonical, digest } from './iam-maintenance-source.mjs'

const categories = new Set([
  'business',
  'public',
  'session_self_service',
  'restricted_automation',
  'internal',
  'webhook',
])
const lifecycle = new Set(['active', 'deprecated', 'retired'])
const implementationStatuses = new Set(['implemented', 'placeholder', 'pending-migration'])
const runtimeModels = new Set(['legacy', 'v2', 'not-applicable'])
const unique = (items) => new Set(items).size === items.length

// Declaration maturity is not the deployed guard model, business status, or a grant.
export function validateDeclarationStates(resources, permissions = []) {
  const resourceIndex = new Map(resources.map((item) => [item.resource_code, item]))
  for (const item of [...resources, ...permissions]) {
    const identity = item.resource_code ?? item.permission_key
    if (
      !lifecycle.has(item.lifecycle) ||
      !implementationStatuses.has(item.implementation_status) ||
      !runtimeModels.has(item.runtime_authorization_model)
    )
      throw new Error(`Invalid separated declaration state: ${identity}`)
  }
  for (const item of resources) {
    if (
      item.resource_type === 'module'
        ? item.runtime_authorization_model !== 'not-applicable'
        : item.implementation_status === 'implemented' &&
          item.runtime_authorization_model === 'not-applicable'
    )
      throw new Error(`Invalid runtime guard model: ${item.resource_code}`)
  }
  function requireOwnerState(item, owner, identity) {
    if (
      !owner ||
      item.lifecycle !== owner.lifecycle ||
      item.implementation_status !== owner.implementation_status ||
      item.runtime_authorization_model !== owner.runtime_authorization_model
    )
      throw new Error(`Template/owner declaration state mismatch: ${identity}`)
    if (item.lifecycle === 'active' && owner.implementation_status !== 'implemented')
      throw new Error(`Active template has an unimplemented owner: ${identity}`)
  }
  for (const item of permissions)
    requireOwnerState(item, resourceIndex.get(item.frontend_resource_code), item.permission_key)
}

export function declarationStatesReady(resources, permissions = []) {
  validateDeclarationStates(resources, permissions)
  return [...resources, ...permissions].every(
    (item) => item.lifecycle === 'active' && item.implementation_status === 'implemented',
  )
}

export function validateFunctions(functions) {
  if (!Array.isArray(functions) || !functions.length)
    throw new Error('Empty/missing backend Function catalog')
  const codes = new Set()
  const endpoints = new Set()
  for (const fn of functions) {
    const endpoint = `${fn.service_code}:${fn.http_method} ${fn.api_path}`
    if (!fn.resource_code || codes.has(fn.resource_code))
      throw new Error(`Duplicate/missing Function: ${fn.resource_code}`)
    if (
      !fn.app_code ||
      !fn.service_code ||
      !/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/u.test(fn.http_method) ||
      !/^\/[\w/{}:.-]+$/u.test(fn.api_path) ||
      endpoints.has(endpoint)
    )
      throw new Error(`Invalid/duplicate endpoint: ${endpoint}`)
    if (
      !['read', 'write'].includes(fn.function_access_mode) ||
      !categories.has(fn.authorization_category) ||
      typeof fn.composable !== 'boolean' ||
      typeof fn.high_risk_permission_operation !== 'boolean' ||
      !lifecycle.has(fn.lifecycle)
    )
      throw new Error(`Incomplete Function policy: ${fn.resource_code}`)
    if (fn.authorization_category !== 'business' && fn.composable)
      throw new Error(`Non-business Function is composable: ${fn.resource_code}`)
    codes.add(fn.resource_code)
    endpoints.add(endpoint)
  }
}

// Offline assembly exports are authoritative inputs, not proof of deployment.
export function validateFunctionCatalog(catalog) {
  if (catalog.schema_version !== '3.0')
    throw new Error('Unsupported backend Function schema; expected 3.0')
  if (
    catalog.scope !== 'all-discovered-api-hosts' ||
    catalog.export_mode !== 'offline-assembly-scan' ||
    !Array.isArray(catalog.hosts) ||
    !catalog.hosts.length
  )
    throw new Error('Missing complete backend host coverage')
  validateFunctions(catalog.functions)
  const services = new Set()
  for (const host of catalog.hosts) {
    const rows = catalog.functions.filter((fn) => fn.service_code === host.service_code)
    if (
      !host.service_code ||
      services.has(host.service_code) ||
      !host.route_prefix ||
      !host.assembly_name ||
      !host.build_version ||
      host.complete !== true ||
      !Number.isSafeInteger(host.function_count) ||
      host.function_count < 0 ||
      host.function_count !== rows.length
    )
      throw new Error(`Incomplete/mismatched backend host: ${host.service_code}`)
    services.add(host.service_code)
  }
  if (catalog.functions.some((fn) => !services.has(fn.service_code)))
    throw new Error('Function belongs to an undeclared backend host')
}

export function functionIndex(snapshot) {
  validateFunctions(snapshot.functions)
  if (digest(canonical(snapshot.functions)) !== snapshot.content_hash)
    throw new Error('Backend Function snapshot hash mismatch')
  return new Map(snapshot.functions.map((fn) => [fn.resource_code, fn]))
}

export function resolveEndpoint(api, functions, serviceCode) {
  const matches = [...functions.values()].filter(
    (fn) =>
      `${fn.http_method} ${fn.api_path}` === api &&
      (!serviceCode || fn.service_code === serviceCode),
  )
  if (matches.length !== 1)
    throw new Error(`Unknown/ambiguous authoritative Function: ${serviceCode ?? '*'} ${api}`)
  return matches[0]
}

export function validateTemplates(resources, permissions, functions) {
  const resourceIndex = new Map()
  for (const item of resources) {
    if (
      !item.resource_code ||
      !item.app_code ||
      !['module', 'menu', 'button', 'button_page'].includes(item.resource_type)
    )
      throw new Error(`Invalid frontend resource: ${item.resource_code}`)
    if (resourceIndex.has(item.resource_code))
      throw new Error(`Duplicate resource: ${item.resource_code}`)
    resourceIndex.set(item.resource_code, item)
  }
  for (const item of resources) {
    const directParent = resourceIndex.get(item.parent_resource_code)
    const allowedParents = {
      module: [],
      menu: ['module'],
      button: ['menu', 'button_page'],
      button_page: ['menu', 'button_page'],
    }
    if (
      item.resource_type === 'module'
        ? Boolean(item.parent_resource_code)
        : !allowedParents[item.resource_type].includes(directParent?.resource_type)
    )
      throw new Error(`Invalid resource hierarchy: ${item.resource_code}`)
    const chain = new Set([item.resource_code])
    let parent = item.parent_resource_code
    while (parent) {
      if (chain.has(parent)) throw new Error(`Cyclic resource parent: ${item.resource_code}`)
      chain.add(parent)
      const owner = resourceIndex.get(parent)
      if (!owner) throw new Error(`Orphan resource: ${item.resource_code} -> ${parent}`)
      if (owner.resource_type === 'button') throw new Error(`Button cannot own children: ${parent}`)
      if (owner.app_code !== item.app_code)
        throw new Error(`Cross-App resource parent: ${item.resource_code}`)
      parent = owner.parent_resource_code
    }
  }
  const keys = new Map()
  for (const item of permissions) {
    const identity = `${item.app_code}:${item.permission_key}`
    if (keys.has(identity)) throw new Error(`Duplicate permission_key: ${identity}`)
    keys.set(identity, item)
    const root = resourceIndex.get(item.frontend_resource_code)
    if (
      !root ||
      !['menu', 'button', 'button_page'].includes(root.resource_type) ||
      root.app_code !== item.app_code
    )
      throw new Error(`Invalid frontend Permission root: ${item.permission_key}`)
    if (!unique(item.function_resource_codes))
      throw new Error(`Duplicate Function binding: ${item.permission_key}`)
    if (item.permission_kind === 'frontend_only') {
      if (item.function_resource_codes.length || !item.local_only_reason)
        throw new Error(`Unproven frontend_only: ${item.permission_key}`)
    } else if (item.permission_kind !== 'business' || !item.function_resource_codes.length) {
      throw new Error(`Invalid business Permission: ${item.permission_key}`)
    }
    for (const code of item.function_resource_codes) {
      const fn = functions.get(code)
      if (!fn) throw new Error(`Unknown Function ${code} in ${item.permission_key}`)
      if (fn.authorization_category !== 'business' || !fn.composable || fn.lifecycle !== 'active')
        throw new Error(`Noncomposable Function ${code} in ${item.permission_key}`)
      if (root.resource_type !== 'button' && fn.function_access_mode !== 'read')
        throw new Error(`Write Function on read-only root: ${item.permission_key} -> ${code}`)
      // business + composable permits cross-App reuse; provider ownership stays unchanged.
    }
  }
  for (const item of permissions) {
    if (
      !Object.hasOwn(item, 'parent_permission_key') ||
      typeof item.default_selected_with_parent !== 'boolean'
    )
      throw new Error('Missing Permission hierarchy metadata: ' + item.permission_key)
    const visited = new Set([item.permission_key])
    let parentKey = item.parent_permission_key
    while (parentKey !== null) {
      const parent = keys.get(item.app_code + ':' + parentKey)
      if (!parent || visited.has(parentKey))
        throw new Error('Invalid/cyclic/cross-App Permission parent: ' + item.permission_key)
      visited.add(parentKey)
      parentKey = parent.parent_permission_key
    }
    if (
      item.default_selected_with_parent &&
      item.function_resource_codes.some(
        (code) => functions.get(code)?.function_access_mode === 'write',
      )
    )
      throw new Error('Write Permission cannot default select: ' + item.permission_key)
  }
}
