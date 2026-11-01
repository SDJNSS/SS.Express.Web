import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { canonical, constantReader } from './iam-maintenance-source.mjs'

export const AUTHORIZATION_ROLLOUT_FILE = 'standards/iam/authorization-rollout.json'
export const AUTHORIZATION_ROLLOUT_GATES = Object.freeze([
  'exact-page-and-button-guards',
  'controlled-v2-initialization',
  'ordinary-user-positive-negative-verification',
])
const initialRoutes = Object.freeze([
  '/iam/group',
  '/iam/tenants',
  '/iam/organizations',
  '/iam/positions',
  '/iam/members',
  '/iam/roles',
])
const pendingEvidence = Object.freeze({
  'exact-page-and-button-guards': 'not-implemented',
  'controlled-v2-initialization': 'not-verified',
  'ordinary-user-positive-negative-verification': 'not-verified',
})
const sameSet = (left, right) =>
  Array.isArray(left) &&
  new Set(left).size === left.length &&
  canonical([...left].sort()) === canonical([...right].sort())
const exactKeys = (value, keys) =>
  value && typeof value === 'object' && sameSet(Object.keys(value), keys)

function legacyCode(symbol, legacyPermissions) {
  const match = /^IAM_PERMISSIONS\.([a-zA-Z]+)\.([a-zA-Z]+)$/u.exec(symbol ?? '')
  const code = match && legacyPermissions[match[1]]?.[match[2]]
  if (typeof code !== 'string' || !code) throw new Error(`Unknown Legacy guard: ${symbol}`)
  return code
}

/**
 * Pure, fail-closed phase validation. Protocol 1.0 intentionally has no activation
 * transition: editing declarations or evidence labels can never enable V2 guards.
 * Source excerpts locate observed guards, not a proof of arbitrary runtime paths.
 */
export function validateAuthorizationRollout(
  contract,
  { pages, routes, resources, sourceTexts, legacyPermissions },
) {
  if (
    !exactKeys(contract, [
      'schema_version',
      'scope',
      'supported_stage',
      'activation_switch',
      'legacy_v2_union',
      'required_gates',
      'pages',
    ]) ||
    contract.schema_version !== '1.0' ||
    contract.scope !== 'iam-foundation-six-routes' ||
    contract.supported_stage !== 'declared-legacy' ||
    contract.activation_switch !== 'not-implemented' ||
    contract.legacy_v2_union !== 'forbidden' ||
    !sameSet(contract.required_gates, AUTHORIZATION_ROLLOUT_GATES) ||
    !Array.isArray(contract.pages) ||
    !sameSet(
      contract.pages.map((entry) => entry.route_path),
      initialRoutes,
    )
  )
    throw new Error('Unsupported authorization rollout protocol or activation/union claim')

  for (const entry of contract.pages) {
    if (
      !exactKeys(entry, [
        'route_path',
        'resource_code',
        'registry_file',
        'registry_key',
        'stage',
        'runtime_authorization_model',
        'activation_allowed',
        'gate_evidence',
        'route_source',
        'route_permission_symbol',
        'view_files',
        'control_bindings',
      ]) ||
      entry.stage !== 'declared-legacy' ||
      entry.runtime_authorization_model !== 'legacy' ||
      entry.activation_allowed !== false ||
      canonical(entry.gate_evidence) !== canonical(pendingEvidence)
    )
      throw new Error(`Unsupported activation transition: ${entry.route_path}`)

    const page = pages.find((item) => item.route_path === entry.route_path)
    const route = routes.find((item) => item.route_path === entry.route_path)
    const resource = resources.find((item) => item.resource_code === entry.resource_code)
    if (
      !page ||
      !route ||
      !resource ||
      page.resource_code !== entry.resource_code ||
      page.registry_file !== entry.registry_file ||
      page.registry_key !== entry.registry_key ||
      page.authorization_model !== 'legacy' ||
      route.meta.resourceCode !== entry.resource_code ||
      route.meta.authorizationModel === 'v2' ||
      route.meta.permission !== legacyCode(entry.route_permission_symbol, legacyPermissions) ||
      entry.route_source !== 'src/features/iam/routes.ts' ||
      !sourceTexts[entry.route_source]?.includes(entry.route_permission_symbol) ||
      resource.source !== 'frontend' ||
      resource.resource_type !== 'menu' ||
      resource.route_path !== entry.route_path ||
      !sameSet(entry.view_files, page.view_files)
    )
      throw new Error(`Authorization rollout disagrees with production guard: ${entry.route_path}`)

    if (!Array.isArray(entry.control_bindings))
      throw new Error(`Missing Legacy control observations: ${entry.route_path}`)
    const coveredButtons = new Set()
    const observedElements = new Set()
    const viewSource = entry.view_files.map((file) => sourceTexts[file] ?? '').join('\n')
    for (const binding of entry.control_bindings) {
      if (
        !exactKeys(binding, ['element_key', 'legacy_permission_symbol', 'mapping_status']) ||
        binding.mapping_status !== 'observed-only' ||
        observedElements.has(binding.element_key)
      )
        throw new Error(`Invalid Legacy control observation: ${entry.route_path}`)
      observedElements.add(binding.element_key)
      const element = page.elements[binding.element_key]
      if (!element || !viewSource.includes(binding.legacy_permission_symbol))
        throw new Error(
          `Stale Legacy control observation: ${entry.route_path}/${binding.element_key}`,
        )
      legacyCode(binding.legacy_permission_symbol, legacyPermissions)
      if (element.resource_key !== 'page') coveredButtons.add(element.resource_key)
      const target =
        element.target_resource_code ??
        (element.resource_key === 'page'
          ? page.resource_code
          : page.buttons[element.resource_key]?.resource_code)
      if (!resources.some((item) => item.resource_code === target))
        throw new Error(`Missing control target resource: ${target}`)
    }
    if (!sameSet([...coveredButtons], Object.keys(page.buttons)))
      throw new Error(`Incomplete Legacy button observations: ${entry.route_path}`)
  }

  // Account for every registered route, not just the six priority pages. Existing
  // V2 code is NOT an attestation of this environment's initialization or grants.
  const legacyRoutes = pages
    .filter((page) => page.authorization_model === 'legacy')
    .map((page) => page.route_path)
    .sort()
  const v2Routes = pages
    .filter((page) => page.authorization_model === 'v2')
    .map((page) => page.route_path)
    .sort()
  return {
    schema_version: '1.0',
    phase: 'partial-v2-code',
    protocol_file: AUTHORIZATION_ROLLOUT_FILE,
    runtime_activation_ready: false,
    legacy_routes: legacyRoutes,
    v2_code_routes: v2Routes,
    required_gates: [...AUTHORIZATION_ROLLOUT_GATES],
    blocked_route_count: legacyRoutes.length,
  }
}

export function buildAuthorizationRollout(root, { pages, routes, resources }) {
  const contract = JSON.parse(readFileSync(join(root, AUTHORIZATION_ROLLOUT_FILE), 'utf8'))
  // Only the already parsed production registry views are read; this is not a
  // communication rescan and does not approve or rewrite existing chain evidence.
  const files = new Set([
    'src/features/iam/routes.ts',
    ...pages
      .filter((page) => initialRoutes.includes(page.route_path))
      .flatMap((page) => page.view_files),
  ])
  const sourceTexts = Object.fromEntries(
    [...files].map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  )
  const legacyPermissions = constantReader(root).symbol(
    'src/shared/constants/iamPermissions.ts',
    'IAM_PERMISSIONS',
  )
  return validateAuthorizationRollout(contract, {
    pages,
    routes,
    resources,
    sourceTexts,
    legacyPermissions,
  })
}
