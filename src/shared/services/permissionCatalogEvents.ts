type PermissionCatalogListener = () => void | Promise<void>

const listeners = new Set<PermissionCatalogListener>()

export function subscribePermissionCatalogChanged(listener: PermissionCatalogListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function notifyPermissionCatalogChanged(): Promise<void> {
  await Promise.allSettled([...listeners].map((listener) => listener()))
}
