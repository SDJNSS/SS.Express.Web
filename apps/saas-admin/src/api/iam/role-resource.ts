// 角色资源授权 API
import { request } from '@logistics/request';
import type { RoleResource, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/roles';

export function getRoleResources(roleId: number): Promise<ApiResponse<RoleResource[]>> {
  return request.get(`${API_PREFIX}/${roleId}/resources`);
}

export function saveRoleResources(roleId: number, resources: Partial<RoleResource>[]): Promise<ApiResponse<void>> {
  return request.put(`${API_PREFIX}/${roleId}/resources`, { resources });
}

export function getRoleResourceTree(roleId: number): Promise<ApiResponse<any[]>> {
  return request.get(`${API_PREFIX}/${roleId}/resource-tree`);
}

export function removeRoleResource(roleId: number, resourceId: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${roleId}/resources/${resourceId}`);
}
