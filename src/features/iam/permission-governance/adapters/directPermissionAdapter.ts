import { compareEntityIds, sameEntityId } from '@shared/utils/entityId'
import type { EntityId } from '@shared/types/entityId'
import type {
  IamRoleEligiblePermissionsResponse,
  IamRolePermissionSchemeResponse,
  IamRolePermissionSchemeSaveRequest,
  IamSystemResponse,
  IamUserPermissionSchemeResponse,
  IamPermissionSchemeResponse,
} from '../api/permissionGovernanceApi'
import type {
  EffectivePermissionSourceGrant,
  PermissionRoleRecord,
  PermissionTreeNode,
} from '../types/permissionGovernance'
import {
  buildPermissionTreeByApp,
  mapPermissionGovernanceApps,
  type RoleAuthorizationMappingContext,
  type UserEffectivePermissionsMappingContext,
} from './permissionGovernanceAdapter'
import { flattenPermissionNodes, nestPermissionNodes } from './permissionSelection'

function groupPermissionRoots(
  roots: PermissionTreeNode[],
  values: readonly IamPermissionSchemeResponse[],
) {
  const definitions = new Map(values.map((value) => [value.id, value]))
  const groups = new Map<string, PermissionTreeNode>()
  const result: PermissionTreeNode[] = []
  for (const node of roots) {
    const parent = definitions.get(node.id)?.frontend_resource?.parent
    if (!parent) {
      result.push(node)
      continue
    }
    const key = 'group:' + node.appId + ':' + parent.id
    let group = groups.get(key)
    if (!group) {
      group = {
        ...node,
        nodeKey: key,
        nodeType: 'GROUP',
        name: parent.resource_name,
        code: parent.resource_code,
        selectable: false,
        readOnly: true,
        sourceGrants: [],
        children: [],
      }
      delete group.permissionId
      groups.set(key, group)
      result.push(group)
    }
    group.children.push(node)
  }
  return result
}

export function toDirectPermissionSaveRequest(
  role: PermissionRoleRecord,
  permissionIds: readonly EntityId[],
  requestId: string,
): IamRolePermissionSchemeSaveRequest {
  if (!role.version || !role.snapshotVersion) throw new Error('角色授权快照不完整，请重新加载')
  return {
    tenant_id: role.tenantId,
    role_id: role.id,
    role_version: role.version,
    snapshot_version: role.snapshotVersion,
    permission_ids: [...new Set(permissionIds)].sort(compareEntityIds),
    request_id: requestId,
  }
}

export function mapDirectRoleAuthorization(
  value: IamRolePermissionSchemeResponse,
  candidates: IamRoleEligiblePermissionsResponse,
  systems: readonly IamSystemResponse[],
  context: RoleAuthorizationMappingContext,
) {
  if (
    !candidates.scope_complete ||
    !sameEntityId(value.role_id, candidates.role_id) ||
    !sameEntityId(value.tenant_id, candidates.tenant_id) ||
    value.role_version !== candidates.role_version ||
    value.snapshot_version !== candidates.snapshot_version
  )
    throw new Error('授权候选与角色快照不一致，请重新加载')
  const apps = mapPermissionGovernanceApps(systems)
  const assigned = new Set(value.assigned_permission_ids)
  const catalog = new Map(candidates.permissions.map((item) => [item.permission.id, item]))
  if ([...assigned].some((id) => !catalog.has(id)))
    throw new Error('已授权 Permission 不在完整候选中，已禁止覆盖保存')
  const permissionTreeByApp = buildPermissionTreeByApp(
    candidates.permissions.map((item) => item.permission),
    apps,
  )
  for (const [appCode, nodes] of Object.entries(permissionTreeByApp)) {
    for (const node of nodes) {
      const candidate = catalog.get(node.id)!
      node.eligible = candidate.eligible
      node.selectable = candidate.eligible || assigned.has(node.id)
      node.readOnly = !node.selectable
      node.blockingReasons = candidate.blocking_reasons
      node.isSelected = assigned.has(node.id)
    }
    permissionTreeByApp[appCode] = groupPermissionRoots(
      nestPermissionNodes(nodes),
      candidates.permissions.map((item) => item.permission),
    )
  }
  if (
    [...assigned].some(
      (id) =>
        !Object.values(permissionTreeByApp)
          .flatMap(flattenPermissionNodes)
          .some((node) => node.permissionId === id),
    )
  ) {
    throw new Error('App 目录缺少已授权权限所属应用，已禁止覆盖保存')
  }
  const role: PermissionRoleRecord = {
    id: value.role_id,
    tenantId: value.tenant_id,
    tenantName: context.tenantName,
    roleCode: value.role_code,
    roleName: value.role_name,
    roleType: context.roleType,
    status: context.status,
    canMaintain: context.canMaintain,
    permissionIds: [...assigned],
    version: value.role_version,
    snapshotVersion: value.snapshot_version,
  }
  return { apps, role, permissionTreeByApp }
}

export function mapDirectUserPermissions(
  value: IamUserPermissionSchemeResponse,
  systems: readonly IamSystemResponse[],
  context: UserEffectivePermissionsMappingContext,
) {
  const apps = mapPermissionGovernanceApps(systems)
  const roles: PermissionRoleRecord[] = value.roles.map((role) => ({
    id: role.role_id,
    tenantId: value.tenant_id,
    tenantName: context.tenantName,
    roleName: role.role_name,
    roleCode: role.role_code,
    roleType: 'UNKNOWN',
    status: 'ACTIVE',
    canMaintain: false,
    permissionIds: role.permission_ids,
    version: '',
    snapshotVersion: '',
  }))
  const sourcesByPermissionId: Record<EntityId, EffectivePermissionSourceGrant[]> = {}
  for (const permission of value.permissions)
    sourcesByPermissionId[permission.id] = value.roles
      .filter((role) => permission.source_role_ids.includes(role.role_id))
      .map((role) => ({
        roleId: role.role_id,
        roleCode: role.role_code,
        roleName: role.role_name,
        permissionId: permission.id,
        permissionName: permission.permission_name,
      }))
  const permissionTreeByApp = buildPermissionTreeByApp(value.permissions, apps, {
    selectable: false,
  })
  for (const [appCode, nodes] of Object.entries(permissionTreeByApp)) {
    for (const node of nodes) {
      node.sourceGrants = sourcesByPermissionId[node.id] ?? []
      for (const resourceNode of flattenPermissionNodes(node.children)) {
        const resource = value.effective_resources.find(
          (grant) => grant.resource.id === resourceNode.resourceId,
        )
        resourceNode.sourceGrants = (resource?.source_permission_ids ?? []).flatMap(
          (id) => sourcesByPermissionId[id] ?? [],
        )
      }
    }
    permissionTreeByApp[appCode] = nestPermissionNodes(nodes)
  }
  return {
    apps,
    roles,
    permissionTreeByApp,
    subject: {
      userId: value.user_id,
      tenantId: value.tenant_id,
      userName: context.userName,
      tenantName: context.tenantName,
      roleIds: roles.map((role) => role.id),
      effectivePermissionIds: value.permissions.map((permission) => permission.id),
      effectiveResourceIds: value.effective_resources.map((grant) => grant.resource.id),
      authorizationVersion: value.authorization_version,
      sourcesByPermissionId,
    },
  }
}
