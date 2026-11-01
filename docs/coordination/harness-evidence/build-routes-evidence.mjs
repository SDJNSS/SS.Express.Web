// Read-only exporter for the explicitly reviewed route evidence (2026-09-27).
// The saved fragment is the review lock, not an input to automatic re-approval.
// Any changed candidate, source, provider/dependency, or consumed Function must
// be independently reviewed and explicitly updated in that fragment first.
import { readFileSync } from 'node:fs'
import console from 'node:console'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  canonical,
  digest,
  discoverCommunications,
} from '../../../scripts/lib/iam-maintenance-source.mjs'
import { functionIndex } from '../../../scripts/lib/iam-maintenance-model.mjs'
import { validateCommunicationInventory } from '../../../scripts/lib/iam-communication-review.mjs'

const fragmentPath = 'docs/coordination/harness-evidence/routes-communication.json'
const prefixes = [
  'training/',
  'iam/access-control/',
  'iam/overview/',
  'platform/dashboard/',
  'platform/framework/',
  'tms/',
  'vms/',
]
const inScope = (file) =>
  prefixes.some((prefix) => file.startsWith('src/features/' + prefix)) ||
  ['src/features/iam/routes.ts', 'src/features/platform/routes.ts'].includes(file)

export function assertReviewedRouteEvidence(source, inventory, functions) {
  const expectedFiles = source.sources
    .filter((entry) => inScope(entry.file))
    .map((entry) => entry.file)
  const reviewedFiles = inventory.sources.map((entry) => entry.file)
  if (canonical(expectedFiles.sort()) !== canonical(reviewedFiles.sort()))
    throw new Error(
      'Route evidence scope changed; independently review added/removed sources first.',
    )
  if (inventory.sources.some((entry) => entry.status !== 'reviewed'))
    throw new Error('Route evidence contains pending review; this exporter cannot approve it.')

  // The shared validator expects a repository-wide inventory. Other reviewers'
  // sources are supplied as pending for validation only and are never exported.
  // All approved hashes/classifications/chains/Function fingerprints remain the
  // exact saved values: validation compares them with the current repository.
  const otherSources = source.sources
    .filter((entry) => !inScope(entry.file))
    .map((entry) => ({
      ...entry,
      candidates_hash: digest(
        canonical(
          source.candidates
            .filter((candidate) => candidate.file === entry.file)
            .map((candidate) => candidate.candidate_id)
            .sort(),
        ),
      ),
      status: 'pending',
      reason: 'Outside this locked fragment; another reviewer owns this source.',
    }))
  validateCommunicationInventory(
    source,
    { ...inventory, sources: [...inventory.sources, ...otherSources] },
    functions,
  )
  return inventory
}

function main() {
  const root = process.cwd()
  const source = discoverCommunications(root)
  const functions = functionIndex(
    JSON.parse(
      readFileSync(resolve(root, 'standards/iam/backend-functions.snapshot.json'), 'utf8'),
    ),
  )
  const inventory = assertReviewedRouteEvidence(
    source,
    JSON.parse(readFileSync(resolve(root, fragmentPath), 'utf8')),
    functions,
  )
  const command = process.argv[2]
  if (command === 'validate') {
    console.log(
      'Locked route evidence valid: source/candidates, dependency closure, exact Function fingerprints; no review regenerated.',
    )
    return
  }
  let output = inventory
  if (command === 'summary')
    output = {
      sources: inventory.sources.length,
      candidates: source.candidates.filter((candidate) => inScope(candidate.file)).length,
      reviewed: inventory.sources.reduce(
        (count, entry) =>
          count +
          entry.candidate_reviews.reduce((total, review) => total + review.candidate_ids.length, 0),
        0,
      ),
      chains: inventory.chains.length,
      pending: [],
    }
  else if (command === 'sources' || command === 'chains') {
    const start = Number(process.argv[3] ?? 0)
    if (!Number.isSafeInteger(start) || start < 0)
      throw new Error('Slice offset must be a non-negative integer.')
    output = inventory[command].slice(start, start + 10)
  } else if (command === 'meta') output = { ...inventory, sources: [], chains: [] }
  else if (command) throw new Error('Unknown command: ' + command)
  console.log(JSON.stringify(output, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
