import type { EntityId } from '@shared/types/entityId'
import type { PermissionTreeNode } from '../types/permissionGovernance'

export function flattenPermissionNodes(nodes: readonly PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenPermissionNodes(node.children)])
}

/** Display ownership never grants an ancestor. Missing ungranted parents remain separate roots. */
export function nestPermissionNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  const byId = new Map(nodes.map((node) => [node.permissionId, node]))
  const roots: PermissionTreeNode[] = []
  for (const node of nodes) {
    const visited = new Set<EntityId>()
    let current: PermissionTreeNode | undefined = node
    while (current?.permissionId !== undefined) {
      if (visited.has(current.permissionId)) throw new Error('权限展示层级存在循环，请修正目录')
      visited.add(current.permissionId)
      current =
        current.parentPermissionId == null ? undefined : byId.get(current.parentPermissionId)
    }
    const parent = node.parentPermissionId == null ? undefined : byId.get(node.parentPermissionId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function isGrantable(node: PermissionTreeNode): boolean {
  return (
    node.nodeType === 'PERMISSION' &&
    node.selectable &&
    !node.readOnly &&
    node.status === 'ACTIVE' &&
    node.eligible !== false
  )
}

/** Only a deliberate check traverses continuous opt-in edges; uncheck never cascades. */
export function selectPermission(
  nodes: readonly PermissionTreeNode[],
  keys: readonly string[],
  nodeKey: string,
  checked: boolean,
): { keys: string[]; defaultAdded: PermissionTreeNode[] } {
  const node = flattenPermissionNodes(nodes).find((item) => item.nodeKey === nodeKey)
  const next = new Set(keys)
  const defaultAdded: PermissionTreeNode[] = []
  if (!node || (!isGrantable(node) && !(next.has(nodeKey) && !checked))) {
    return { keys: [...next], defaultAdded }
  }
  if (!checked) next.delete(nodeKey)
  else {
    next.add(nodeKey)
    const visit = (parent: PermissionTreeNode) => {
      for (const child of parent.children) {
        if (
          child.nodeType !== 'PERMISSION' ||
          !child.defaultSelectedWithParent ||
          !isGrantable(child)
        )
          continue
        if (!next.has(child.nodeKey)) defaultAdded.push(child)
        next.add(child.nodeKey)
        visit(child)
      }
    }
    visit(node)
  }
  return { keys: [...next], defaultAdded }
}
