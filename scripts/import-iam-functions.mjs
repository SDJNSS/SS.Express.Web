import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonical, digest } from './lib/iam-maintenance-source.mjs'
import { validateFunctionCatalog } from './lib/iam-maintenance-model.mjs'

// An explicit, offline import. CI consumes the reviewed snapshot in this repo;
// it never relies on another checkout, a user's Downloads directory or a server.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const input = process.argv[2]
if (!input) throw new Error('Usage: pnpm iam:functions:import <authoritative-catalog.json>')
const inputPath = resolve(input)
const source = readFileSync(inputPath, 'utf8')
const catalog = JSON.parse(source)
validateFunctionCatalog(catalog)
const functions = [...catalog.functions].sort((a, b) =>
  a.resource_code.localeCompare(b.resource_code, 'en'),
)
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: dirname(inputPath),
  encoding: 'utf8',
}).trim()
const snapshot = {
  schema_version: '1.0',
  provenance: {
    kind: 'backend-source-catalog',
    file_name: inputPath.split(/[\\/]/u).at(-1),
    source_revision: revision,
    source_sha256: digest(source),
    source_schema_version: catalog.schema_version,
    // Source metadata is not evidence of the currently deployed binary or grants.
    runtime_verified: false,
  },
  content_hash: digest(canonical(functions)),
  hosts: catalog.hosts,
  functions,
}
const output = resolve(root, 'standards/iam/backend-functions.snapshot.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Imported ${functions.length} authoritative Functions; runtime/database not verified`)
