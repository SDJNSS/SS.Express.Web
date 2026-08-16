// IAM 权限与访问控制类型定义

// 角色类型
export interface Role {
  id: number;
  tenantId: number;
  roleCode: string;
  roleName: string;
  roleType: string;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 角色模板类型
export interface RoleTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  appCode: string;
  templateType: string;
  roleConfig: Record<string, any>;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 权限资源类型
export interface Resource {
  id: number;
  tenantId: number;
  appId: number;
  parentId: number;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  routePath: string;
  component: string;
  permissionCode: string;
  icon: string;
  httpMethod: string;
  apiPath: string;
  isVisible: boolean;
  sortOrder: number;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  children?: Resource[];
}

// 角色资源授权类型
export interface RoleResource {
  id: number;
  tenantId: number;
  roleId: number;
  resourceId: number;
  actions: string[];
  effect: string;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 角色授权类型
export interface RoleAssignment {
  id: number;
  tenantId: number;
  roleId: number;
  subjectType: 'user' | 'org' | 'position';
  subjectId: number;
  effectiveStart: string;
  effectiveEnd: string;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
  role?: Role;
}

// 数据权限类型
export interface DataScope {
  id: number;
  tenantId: number;
  roleId: number;
  appId: number;
  resourceType: string;
  scopeMode: 'all' | 'dept' | 'dept_tree' | 'self' | 'custom';
  fieldName: string;
  includeChildren: boolean;
  status: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 数据权限明细类型
export interface DataScopeItem {
  id: number;
  tenantId: number;
  dataScopeId: number;
  resourceType: string;
  resourceId: number;
  resourceCode: string;
  resourceName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isDel: boolean;
}

// 查询参数类型
export interface RoleQueryParams {
  tenantId: number;
  roleCode?: string;
  roleName?: string;
  roleType?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface RoleTemplateQueryParams {
  templateCode?: string;
  templateName?: string;
  appCode?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface ResourceQueryParams {
  tenantId: number;
  appId?: number;
  resourceCode?: string;
  resourceName?: string;
  resourceType?: string;
  status?: string;
}

export interface RoleAssignmentQueryParams {
  tenantId: number;
  roleId?: number;
  subjectType?: string;
  subjectId?: number;
  status?: string;
  pageNum: number;
  pageSize: number;
}

export interface DataScopeQueryParams {
  tenantId: number;
  roleId?: number;
  appId?: number;
  resourceType?: string;
  scopeMode?: string;
  pageNum: number;
  pageSize: number;
}
