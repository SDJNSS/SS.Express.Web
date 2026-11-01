import type {
  IamRoleDetailResponse,
  IamRoleAssignmentDetailResponse,
} from '../api/accessControlApi'
import type { RoleRecord, AssignmentRecord } from '../types/accessControl'

function entityStatus(value: string): 'ACTIVE' | 'DISABLED' {
  return value.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DISABLED'
}

export function mapRole(value: IamRoleDetailResponse): RoleRecord {
  return {
    id: value.id,
    tenantId: value.tenant_id,
    tenantCode: value.tenant_code,
    roleCode: value.role_code,
    roleName: value.role_name,
    roleType: value.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
    sortOrder: value.sort_order,
    status: entityStatus(value.status),
    description: value.description,
    remarks: value.remarks,
    isCurrentlyEffective: value.is_currently_effective,
    isGroupControlled: value.is_group_controlled,
    canMaintain: value.can_maintain,
    version: value.version,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }
}

export function mapAssignment(value: IamRoleAssignmentDetailResponse): AssignmentRecord {
  return {
    assignmentId: value.assignment_id,
    tenantId: value.tenant_id,
    tenantUserId: value.tenant_user_id,
    tenantUserCode: value.tenant_user_code,
    displayName: value.display_name,
    roleId: value.role_id,
    roleCode: value.role_code,
    roleName: value.role_name,
    roleType: value.role_type.toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM',
    isTenantAdminIdentity: value.is_tenant_admin_identity,
    isGroupControlled: value.is_group_controlled,
    isAssigned: value.is_assigned,
    isCurrentlyEffective: value.is_currently_effective,
    canMaintain: value.can_maintain,
    invalidReason: value.invalid_reason,
    memberVersion: value.member_version,
  }
}
