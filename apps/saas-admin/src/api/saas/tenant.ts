// 租户管理 API
import { request } from '@logistics/request';
import type { Tenant, TenantQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/saas/v1/tenants';

// 创建租户
export function createTenant(data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
  return request.post(API_PREFIX, data);
}

// 分页查询租户
export function getTenantList(params: TenantQueryParams): Promise<ApiResponse<PageResponse<Tenant>>> {
  return request.get(API_PREFIX, { params });
}

// 获取租户详情
export function getTenantDetail(id: number): Promise<ApiResponse<Tenant>> {
  return request.get(`${API_PREFIX}/${id}`);
}

// 修改租户
export function updateTenant(id: number, data: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

// 冻结租户
export function freezeTenant(id: number, reason?: string): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/freeze`, { reason });
}

// 解冻租户
export function unfreezeTenant(id: number, reason?: string): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/unfreeze`, { reason });
}

// 注销租户
export function cancelTenant(id: number, reason?: string): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/cancel`, { reason });
}

// 删除租户
export function deleteTenant(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
