#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { buildMaintenanceManifest } from './lib/iam-maintenance-manifest.mjs'
import { canonical, discoverCommunications, discoverRoutes } from './lib/iam-maintenance-source.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
try {
  const flags = process.argv.slice(2)
  if (flags.length > 1 || flags.some((flag) => !['--write', '--scan', '--ready'].includes(flag)))
    throw new Error('Use one of --write, --scan, --ready; no flag checks the committed artifact')
  if (flags.includes('--scan')) {
    // Diagnostic only. Does not update source-review dispositions or templates.
    const discovery = { routes: discoverRoutes(root), ...discoverCommunications(root) }
    mkdirSync(join(root, 'artifacts'), { recursive: true })
    writeFileSync(
      join(root, 'artifacts/iam-maintenance.discovery.json'),
      JSON.stringify(discovery, null, 2) + '\n',
    )
    console.log(
      `Discovery: ${discovery.routes.length} production routes, ${discovery.sources.length} source files, ${discovery.candidates.length} communication candidates; artifacts/iam-maintenance.discovery.json (not approval)`,
    )
  } else {
    const manifest = buildMaintenanceManifest(root)
    const schema = JSON.parse(
      readFileSync(join(root, 'standards/schemas/iam-maintenance.frontend.schema.json'), 'utf8'),
    )
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema)
    if (!validate(manifest))
      throw new Error(`Invalid maintenance manifest: ${JSON.stringify(validate.errors)}`)
    const output = join(root, 'artifacts/iam-maintenance.frontend.json')
    if (flags.includes('--write')) {
      mkdirSync(dirname(output), { recursive: true })
      writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n')
    } else {
      if (!existsSync(output))
        throw new Error('Missing manifest; run pnpm iam:maintenance:generate')
      const previous = JSON.parse(readFileSync(output, 'utf8'))
      // A commit alone does not change semantic content; source_content_hash binds dirty worktrees.
      previous.meta.source_revision = manifest.meta.source_revision
      if (canonical(previous) !== canonical(manifest))
        throw new Error('Stale manifest; review changes then run pnpm iam:maintenance:generate')
    }
    const c = manifest.coverage
    console.log(
      `Maintenance: ${c.registered_routes}/${c.production_routes} registered routes, ${manifest.permission_templates.length} Permission templates, ${c.unresolved_communications} unresolved candidates; complete=${manifest.meta.complete}; ready_for_sync=${manifest.meta.ready_for_sync}; runtime_activation_ready=${manifest.authorization_rollout.runtime_activation_ready}; legacy_routes=${manifest.authorization_rollout.legacy_routes.length}`,
    )
    if (flags.includes('--ready') && (!manifest.meta.complete || !manifest.meta.ready_for_sync))
      throw new Error(
        'Not eligible for full synchronization: pending migration/communication evidence. No remote writes were made.',
      )
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
