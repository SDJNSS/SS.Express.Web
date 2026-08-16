// IAM 组织与身份域类型定义

// 用户类型
export interface User {
  id: number;
  username: string;
  passwordHash?: string;
  passwordSalt?: string;
  realName: string;
  nickName: string;
  phone: string;
  email: string;
  avatarUrl: string;
  userType: string;
  status: string;
  lastLoginAt: string;
  lastLoginIp: string;
  passwordUpdatedAt: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 租户用户类型
export interface TenantUser {
  id: number;
  tenantId: number;
  userId: number;
  tenantUserCode: string;
  displayName: string;
  userType: string;
  status: string;
  isTenantAdmin: boolean;
  joinedAt: string;
  leftAt: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  user?: User;
}

// 会话类型
export interface Session {
  id: number;
  tenantId: number;
  userId: number;
  tenantUserId: number;
  tokenHash: string;
  refreshTokenHash: string;
  deviceId: string;
  deviceType: string;
  loginIp: string;
  userAgent: string;
  sessionStatus: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 组织类型
export interface Org {
  id: number;
  tenantId: number;
  parentId: number;
  orgCode: string;
  orgName: string;
  orgType: string;
  leaderTenantUserId: number;
  path: string;
  level: number;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  children?: Org[];
}

// 岗位类型
export interface Position {
  id: number;
  tenantId: number;
  positionCode: string;
  positionName: string;
  positionType: string;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 查询参数类型
export interface UserQueryParams {
  username?: string;
  realName?: string;
  phone?: string;
  email?: string;
  userType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface TenantUserQueryParams {
  tenantId?: number;
  userId?: number;
  displayName?: string;
  userType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface SessionQueryParams {
  tenantId?: number;
  userId?: number;
  sessionStatus?: string;
  pageNum: number;
  pageSize: number;
}

export interface OrgQueryParams {
  tenantId: number;
  orgCode?: string;
  orgName?: string;
  orgType?: string;
  status?: string;
}

export interface PositionQueryParams {
  tenantId: number;
  positionCode?: string;
  positionName?: string;
  positionType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}
