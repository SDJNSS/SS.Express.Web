// 权限资源管理 API
import { request } from '@logistics/request';
import type { Resource, ResourceQueryParams, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/resources';

export function createResource(data: Partial<Resource>): Promise<ApiResponse<Resource>> {
  return request.post(API_PREFIX, data);
}

export function getResourceTree(tenantId: number, appId?: number): Promise<ApiResponse<Resource[]>> {
  return request.get(`${API_PREFIX}/tree`, { params: { tenantId, appId } });
}

export function getResourceDetail(id: number): Promise<ApiResponse<Resource>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateResource(id: number, data: Partial<Resource>): Promise<ApiResponse<Resource>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function enableResource(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

export function disableResource(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function deleteResource(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
