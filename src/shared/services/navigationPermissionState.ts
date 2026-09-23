export interface NavigationPermissionSnapshot {
  scope: string | null
  permissions: ReadonlySet<string>
  ready: boolean
}

type NavigationPermissionListener = (snapshot: NavigationPermissionSnapshot) => void

let currentSnapshot: NavigationPermissionSnapshot = {
  scope: null,
  permissions: new Set<string>(),
  ready: false,
}

const listeners = new Set<NavigationPermissionListener>()

export function getNavigationPermissionSnapshot(): NavigationPermissionSnapshot {
  return currentSnapshot
}

export function publishNavigationPermissionSnapshot(
  scope: string | null,
  values: Iterable<string>,
  ready: boolean,
): void {
  currentSnapshot = {
    scope,
    permissions: new Set(values),
    ready,
  }
  listeners.forEach((listener) => listener(currentSnapshot))
}

export function subscribeNavigationPermissionSnapshot(
  listener: NavigationPermissionListener,
): () => void {
  listeners.add(listener)
  listener(currentSnapshot)
  return () => listeners.delete(listener)
}
