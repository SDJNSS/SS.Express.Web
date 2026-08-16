// 审计域类型定义

// 登录审计类型
export interface LoginLog {
  id: number;
  tenantId: number;
  userId: number;
  tenantUserId: number;
  username: string;
  loginType: string;
  loginStatus: 'pending' | 'success' | 'failure';
  loginIp: string;
  userAgent: string;
  deviceType: string;
  failureReason: string;
  loginAt: string;
  logoutAt: string;
  sessionId: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 操作审计类型
export interface OperationLog {
  id: number;
  tenantId: number;
  userId: number;
  tenantUserId: number;
  appCode: string;
  moduleCode: string;
  operationType: string;
  operationName: string;
  resourceType: string;
  resourceId: number;
  requestMethod: string;
  requestPath: string;
  requestParam: string;
  responseStatus: number;
  success: boolean;
  errorMessage: string;
  operationIp: string;
  userAgent: string;
  operationAt: string;
  durationMs: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 权限变更审计类型
export interface PermissionChangeLog {
  id: number;
  tenantId: number;
  operatorUserId: number;
  targetType: string;
  targetId: number;
  changeType: string;
  beforeData: Record<string, any>;
  afterData: Record<string, any>;
  changeReason: string;
  operationIp: string;
  operationAt: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 数据导出审计类型
export interface DataExportLog {
  id: number;
  tenantId: number;
  userId: number;
  tenantUserId: number;
  appCode: string;
  exportType: string;
  exportName: string;
  resourceType: string;
  exportScope: string;
  fileName: string;
  fileUrl: string;
  rowCount: number;
  exportStatus: 'success' | 'failure';
  failureReason: string;
  requestParam: string;
  exportedAt: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 查询参数类型
export interface LoginLogQueryParams {
  tenantId?: number;
  userId?: number;
  username?: string;
  loginStatus?: string;
  loginType?: string;
  startTime?: string;
  endTime?: string;
  pageNum: number;
  pageSize: number;
}

export interface OperationLogQueryParams {
  tenantId?: number;
  userId?: number;
  appCode?: string;
  moduleCode?: string;
  operationType?: string;
  success?: boolean;
  startTime?: string;
  endTime?: string;
  pageNum: number;
  pageSize: number;
}

export interface PermissionChangeLogQueryParams {
  tenantId?: number;
  operatorUserId?: number;
  targetType?: string;
  changeType?: string;
  startTime?: string;
  endTime?: string;
  pageNum: number;
  pageSize: number;
}

export interface DataExportLogQueryParams {
  tenantId?: number;
  userId?: number;
  appCode?: string;
  exportType?: string;
  exportStatus?: string;
  startTime?: string;
  endTime?: string;
  pageNum: number;
  pageSize: number;
}
