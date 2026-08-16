// 角色授权 API
import { request } from '@logistics/request';
import type { RoleAssignment, RoleAssignmentQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/role-assignments';

export function createRoleAssignment(data: Partial<RoleAssignment>): Promise<ApiResponse<RoleAssignment>> {
  return request.post(API_PREFIX, data);
}

export function getRoleAssignmentList(params: RoleAssignmentQueryParams): Promise<ApiResponse<PageResponse<RoleAssignment>>> {
  return request.get(API_PREFIX, { params });
}

export function updateRoleAssignment(id: number, data: Partial<RoleAssignment>): Promise<ApiResponse<RoleAssignment>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function deleteRoleAssignment(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}

export function getCurrentUserRoles(): Promise<ApiResponse<any[]>> {
  return request.get('/api/iam/v1/current-user/roles');
}
