import retirements from '../../../standards/iam-retirements.json'

const retiredRoutes = new Set(retirements.pages.map((page) => page.route_path))

/** A stale backend menu must not resurrect an explicitly retired frontend page. */
export function isRetiredIamRoute(path: string): boolean {
  const pathname = path.split(/[?#]/u)[0]?.replace(/\/+$/u, '') ?? ''
  return retiredRoutes.has(pathname)
}
