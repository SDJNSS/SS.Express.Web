export interface FunctionPermissionSnapshot {
  permissions: ReadonlySet<string>
  ready: boolean
}

type FunctionPermissionListener = (snapshot: FunctionPermissionSnapshot) => void

let currentSnapshot: FunctionPermissionSnapshot = {
  permissions: new Set<string>(),
  ready: false,
}

const listeners = new Set<FunctionPermissionListener>()

export function getFunctionPermissionSnapshot(): FunctionPermissionSnapshot {
  return currentSnapshot
}

export function publishFunctionPermissionSnapshot(values: Iterable<string>, ready: boolean): void {
  currentSnapshot = {
    permissions: new Set(values),
    ready,
  }
  listeners.forEach((listener) => listener(currentSnapshot))
}

export function subscribeFunctionPermissionSnapshot(
  listener: FunctionPermissionListener,
): () => void {
  listeners.add(listener)
  listener(currentSnapshot)
  return () => listeners.delete(listener)
}
