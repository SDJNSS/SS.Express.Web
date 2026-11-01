import { canonical, digest, dependencyClosure } from './iam-maintenance-source.mjs'

export const scaffoldFile = 'src/shared/business-components/FeatureScaffoldPage.vue'

// The route remains in discovery. Evidence only describes the placeholder's
// content; Shell/authentication/provider communications remain globally audited.
export function validatePlaceholderEvidence(routes, migration, evidence, source) {
  if (evidence.schema_version !== '1.0') throw new Error('Unsupported placeholder evidence')
  const placeholders = new Set(migration.placeholder_routes)
  const current = new Map(source.sources.map((item) => [item.file, item]))
  const candidates = new Map(source.candidates.map((item) => [item.candidate_id, item]))
  const verified = new Map()
  for (const proof of evidence.entries) {
    if (
      !proof.evidence_id?.trim() ||
      !proof.reviewed_by?.trim() ||
      !proof.evidence?.length ||
      proof.evidence.some((item) => typeof item !== 'string' || !item.trim())
    )
      throw new Error('Missing independent placeholder evidence')
    if (proof.component_file !== scaffoldFile || !proof.route_paths?.length)
      throw new Error(`Invalid placeholder component evidence: ${proof.evidence_id}`)
    const closure = dependencyClosure(proof.component_file, source.dependencies)
    const scoped = source.candidates.filter((c) => closure.includes(c.file))
    if (scoped.some((c) => ['request', 'dynamic-route', 'dynamic-import'].includes(c.kind)))
      throw new Error(`Placeholder contains unresolved communication: ${proof.evidence_id}`)
    if (proof.candidates_hash !== digest(canonical(scoped.map((c) => c.candidate_id).sort())))
      throw new Error(`Placeholder candidate evidence changed: ${proof.evidence_id}`)
    const required = new Set(closure)
    const classified = new Set()
    for (const review of proof.candidate_reviews ?? []) {
      const candidate = candidates.get(review.candidate_id)
      if (
        !candidate ||
        !closure.includes(candidate.file) ||
        classified.has(review.candidate_id) ||
        review.classification !== 'local' ||
        !review.reason?.trim()
      )
        throw new Error(`Invalid placeholder candidate disposition: ${proof.evidence_id}`)
      classified.add(review.candidate_id)
      if (candidate.kind === 'injection') {
        const provider = candidates.get(review.provider_candidate_id)
        if (
          candidate.injection_role !== 'consumer' ||
          provider?.injection_role !== 'provider' ||
          !candidate.injection_key ||
          provider.injection_key !== candidate.injection_key
        )
          throw new Error(`Missing placeholder injection provider evidence: ${proof.evidence_id}`)
        // Bind all providers for this key so a newly introduced provider also
        // invalidates the proof, even when its owner lies outside imports.
        for (const item of source.candidates.filter(
          (c) => c.injection_role === 'provider' && c.injection_key === candidate.injection_key,
        ))
          for (const file of dependencyClosure(item.file, source.dependencies)) required.add(file)
      }
    }
    if (scoped.some((candidate) => !classified.has(candidate.candidate_id)))
      throw new Error(`Unclassified placeholder candidate: ${proof.evidence_id}`)
    const expected = [...required].sort().map((file) => {
      if (!current.has(file)) throw new Error(`Missing placeholder source: ${file}`)
      return current.get(file)
    })
    if (canonical(proof.dependencies) !== canonical(expected))
      throw new Error(`Placeholder source/dependency evidence changed: ${proof.evidence_id}`)
    if (
      canonical(Object.keys(proof.route_hashes ?? {}).sort()) !==
      canonical([...proof.route_paths].sort())
    )
      throw new Error(`Placeholder route evidence set changed: ${proof.evidence_id}`)
    for (const path of proof.route_paths) {
      const route = routes.find((item) => item.route_path === path)
      if (
        !placeholders.has(path) ||
        verified.has(path) ||
        route?.component_file !== proof.component_file ||
        route?.meta.implementationStatus !== 'placeholder' ||
        proof.route_hashes[path] !== digest(canonical(route))
      )
        throw new Error(`Placeholder route evidence changed: ${path}`)
      verified.set(path, proof.evidence_id)
    }
  }
  return verified
}
