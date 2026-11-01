/**
 * Stable navigation and Function permission codes returned by IAM's effective permission API.
 * These values control frontend discoverability only; the server remains authoritative.
 */
export const IAM_PERMISSIONS = Object.freeze({
  group: { view: 'iam:group:view', update: 'iam:group:update' },
  tenants: {
    view: 'iam:tenants:view',
    create: 'iam:tenants:create',
    update: 'iam:tenants:update',
    changeStatus: 'iam:tenants:change-status',
  },
  organizations: {
    view: 'iam:organizations:view',
    create: 'iam:organizations:create',
    update: 'iam:organizations:update',
    move: 'iam:organizations:move',
    changeStatus: 'iam:organizations:change-status',
  },
  positions: {
    view: 'iam:positions:view',
    create: 'iam:positions:create',
    update: 'iam:positions:update',
    changeStatus: 'iam:positions:change-status',
  },
  members: {
    view: 'iam:members:view',
    create: 'iam:members:create',
    update: 'iam:members:update',
    updateUser: 'iam:members:update-user',
    changeStatus: 'iam:members:change-status',
    saveOrganization: 'iam:members:save-organization',
    savePosition: 'iam:members:save-position',
    queryPermissions: 'iam:members:permissions:view',
    assignRole: 'iam:members:permissions:assign-role',
    revokeRole: 'iam:members:permissions:revoke-role',
    appointAdmin: 'iam:members:appoint-admin',
    cancelAdmin: 'iam:members:cancel-admin',
    endOrganization: 'iam:members:end-organization',
    endPosition: 'iam:members:end-position',
  },
  roles: {
    view: 'iam:roles:view',
    create: 'iam:roles:create',
    update: 'iam:roles:update',
    changeStatus: 'iam:roles:change-status',
    queryAssignments: 'iam:role-assignments:view',
    assign: 'iam:role-assignments:assign',
    revoke: 'iam:role-assignments:revoke',
  },
} as const)

// Stable V2 identities are generated from the Feature registry, not maintained twice.
export { IAM_PERMISSION_GOVERNANCE_RESOURCES } from './iamPermissionGovernanceResources.generated'
