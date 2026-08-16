// 租户用户管理 API
import { request } from '@logistics/request';
import type { TenantUser, TenantUserQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/tenant-users';

export function createTenantUser(data: Partial<TenantUser>): Promise<ApiResponse<TenantUser>> {
  return request.post(API_PREFIX, data);
}

export function getTenantUserList(params: TenantUserQueryParams): Promise<ApiResponse<PageResponse<TenantUser>>> {
  return request.get(API_PREFIX, { params });
}

export function getTenantUserDetail(id: number): Promise<ApiResponse<TenantUser>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateTenantUser(id: number, data: Partial<TenantUser>): Promise<ApiResponse<TenantUser>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function disableTenantUser(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function leaveTenant(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/leave`);
}

export function setTenantAdmin(id: number, isAdmin: boolean): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/admin`, { isAdmin });
}
