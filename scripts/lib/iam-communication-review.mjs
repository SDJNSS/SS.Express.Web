import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import {
  canonical,
  digest,
  communicationDependencies,
  communicationDependencyHash,
} from './iam-maintenance-source.mjs'
import { resolveEndpoint } from './iam-maintenance-model.mjs'

const schema = JSON.parse(
  readFileSync(
    new URL('../../standards/schemas/iam-communication-inventory.v2.schema.json', import.meta.url),
    'utf8',
  ),
)
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema)

function validateChains(source, inventory, functions) {
  const candidates = new Map(source.candidates.map((c) => [c.candidate_id, c]))
  const chains = new Map()
  for (const chain of inventory.chains ?? []) {
    if (chains.has(chain.chain_id))
      throw new Error(`Duplicate communication chain: ${chain.chain_id}`)
    const entries = new Set(chain.callbacks.map((callback) => callback.file))
    for (const id of chain.candidate_ids) {
      if (!candidates.has(id))
        throw new Error(`Unknown chain candidate: ${chain.chain_id} -> ${id}`)
      entries.add(candidates.get(id).file)
    }
    // Callers/providers can be supplied even when JavaScript passes callbacks
    // without a static import edge. Those extra dependencies are source-bound.
    for (const dependency of chain.dependencies) entries.add(dependency.file)
    const expected = communicationDependencies(source, [...entries])
    if (canonical(chain.dependencies) !== canonical(expected))
      throw new Error(`Changed/incomplete communication chain dependencies: ${chain.chain_id}`)
    const categories = new Set()
    for (const request of chain.requests) {
      if (
        !chain.candidate_ids.includes(request.candidate_id) ||
        candidates.get(request.candidate_id)?.kind !== 'request'
      )
        throw new Error(`Missing request candidate in chain: ${chain.chain_id}`)
      if (!functions)
        throw new Error(`Function authority required for communication chain: ${chain.chain_id}`)
      const fn = resolveEndpoint(request.endpoint, functions)
      if (request.function_resource_code !== fn.resource_code)
        throw new Error(`Communication Function mismatch: ${chain.chain_id} -> ${request.endpoint}`)
      if (request.function_sha256 !== digest(canonical(fn)))
        throw new Error(
          `Changed communication Function authority: ${chain.chain_id} -> ${request.endpoint}`,
        )
      categories.add(fn.authorization_category)
    }
    chains.set(chain.chain_id, { ...chain, categories })
  }
  return chains
}

// Generation never upgrades pending records or acknowledges changed source.
// v1 remains readable only as pending migration evidence; reviewed requires v2.
export function validateCommunicationInventory(source, inventory, functions) {
  if (!['1.0', '2.0'].includes(inventory.schema_version))
    throw new Error('Unsupported communication inventory')
  if (
    inventory.schema_version === '1.0' &&
    ((inventory.chains?.length ?? 0) ||
      inventory.sources.some((entry) => entry.candidate_reviews?.length))
  )
    throw new Error('Candidate-level communication review requires inventory v2')
  if (inventory.schema_version === '2.0' && !validateSchema(inventory))
    throw new Error(`Invalid communication inventory: ${JSON.stringify(validateSchema.errors)}`)
  const current = new Map(source.sources.map((s) => [s.file, s]))
  const candidates = new Map(source.candidates.map((c) => [c.candidate_id, c]))
  const chains = validateChains(source, inventory, functions)
  const recorded = new Map()
  const reviews = new Map()
  for (const entry of inventory.sources) {
    if (recorded.has(entry.file)) throw new Error(`Duplicate communication source: ${entry.file}`)
    recorded.set(entry.file, entry)
    if (!entry.reason?.trim() || !['pending', 'reviewed'].includes(entry.status))
      throw new Error(`Missing communication disposition: ${entry.file}`)
    if (!current.has(entry.file))
      throw new Error(`Removed communication source needs review: ${entry.file}`)
    if (entry.status === 'reviewed' && (!entry.evidence?.length || !entry.reviewed_by?.trim()))
      throw new Error(`Missing independent communication review evidence: ${entry.file}`)
    if (entry.status === 'reviewed' && inventory.schema_version !== '2.0')
      throw new Error(`Candidate-level communication review requires inventory v2: ${entry.file}`)
    if (entry.status === 'reviewed' || entry.candidate_reviews?.length) {
      if (entry.dependency_hash !== communicationDependencyHash(source, [entry.file]))
        throw new Error(`Changed communication review dependencies: ${entry.file}`)
      if (!entry.evidence?.length || !entry.reviewed_by?.trim())
        throw new Error(`Missing independent communication review evidence: ${entry.file}`)
    }
    for (const review of entry.candidate_reviews ?? []) {
      for (const id of review.candidate_ids) {
        const candidate = candidates.get(id)
        if (!candidate || candidate.file !== entry.file)
          throw new Error(`Unknown source review candidate: ${id}`)
        if (reviews.has(id)) throw new Error(`Duplicate candidate classification: ${id}`)
        if (candidate.kind === 'request' && review.classification === 'local')
          throw new Error(`Request candidate cannot be classified local: ${id}`)
        if (candidate.kind === 'injection' && ['local', 'mock'].includes(review.classification))
          throw new Error(`Injection candidate requires a traced chain: ${id}`)
        if (!['local', 'mock'].includes(review.classification) && !review.chain_ids.length)
          throw new Error(`Missing candidate communication chain: ${id}`)
        const referenced = review.chain_ids.map((chainId) => {
          const chain = chains.get(chainId)
          if (!chain || !chain.candidate_ids.includes(id))
            throw new Error(`Candidate is not covered by chain: ${id} -> ${chainId}`)
          return chain
        })
        if (
          ['business', 'public', 'session_self_service'].includes(review.classification) &&
          !referenced.some((chain) => chain.categories.has(review.classification))
        )
          throw new Error(`Candidate classification lacks authoritative Function: ${id}`)
        reviews.set(id, review)
      }
    }
  }
  for (const item of source.sources) {
    const entry = recorded.get(item.file)
    if (!entry || entry.sha256 !== item.sha256)
      throw new Error(
        `New/changed communication source requires review: ${item.file}; inspect pnpm iam:maintenance:scan (generation does not acknowledge changes)`,
      )
    const ids = source.candidates
      .filter((c) => c.file === item.file)
      .map((c) => c.candidate_id)
      .sort()
    if (entry.candidates_hash !== digest(canonical(ids)))
      throw new Error(`Communication scanner evidence changed: ${item.file}`)
    if (entry.status === 'reviewed' && ids.some((id) => !reviews.has(id)))
      throw new Error(`Unclassified communication candidate in reviewed source: ${item.file}`)
  }
  return source.candidates.map((candidate) => ({
    ...candidate,
    review_status: reviews.has(candidate.candidate_id) ? 'reviewed' : 'pending',
    review_reason:
      reviews.get(candidate.candidate_id)?.reason ?? recorded.get(candidate.file).reason,
    ...(reviews.has(candidate.candidate_id)
      ? {
          classification: reviews.get(candidate.candidate_id).classification,
          chain_ids: reviews.get(candidate.candidate_id).chain_ids,
        }
      : {}),
  }))
}
