export interface PageResourcePermissionSnapshot {
  pageResourceCode: string | null
  permissions: ReadonlySet<string>
  ready: boolean
  loadingReason?: 'navigation' | 'refresh'
}

type PageResourcePermissionListener = (snapshot: PageResourcePermissionSnapshot) => void

let currentSnapshot: PageResourcePermissionSnapshot = {
  pageResourceCode: null,
  permissions: new Set<string>(),
  ready: false,
}

const listeners = new Set<PageResourcePermissionListener>()

export function getPageResourcePermissionSnapshot(): PageResourcePermissionSnapshot {
  return currentSnapshot
}

export function publishPageResourcePermissionSnapshot(
  pageResourceCode: string | null,
  values: Iterable<string>,
  ready: boolean,
  loadingReason: PageResourcePermissionSnapshot['loadingReason'] = 'refresh',
): void {
  currentSnapshot = {
    pageResourceCode,
    permissions: new Set(values),
    ready,
    loadingReason,
  }
  listeners.forEach((listener) => listener(currentSnapshot))
}

export function subscribePageResourcePermissionSnapshot(
  listener: PageResourcePermissionListener,
): () => void {
  listeners.add(listener)
  listener(currentSnapshot)
  return () => listeners.delete(listener)
}
