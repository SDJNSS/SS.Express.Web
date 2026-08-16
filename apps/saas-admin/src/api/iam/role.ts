// 角色管理 API
import { request } from '@logistics/request';
import type { Role, RoleQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/roles';

export function createRole(data: Partial<Role>): Promise<ApiResponse<Role>> {
  return request.post(API_PREFIX, data);
}

export function getRoleList(params: RoleQueryParams): Promise<ApiResponse<PageResponse<Role>>> {
  return request.get(API_PREFIX, { params });
}

export function getRoleDetail(id: number): Promise<ApiResponse<Role>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateRole(id: number, data: Partial<Role>): Promise<ApiResponse<Role>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function enableRole(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

export function disableRole(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function deleteRole(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
