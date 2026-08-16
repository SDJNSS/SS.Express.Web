// 数据权限配置 API
import { request } from '@logistics/request';
import type { DataScope, DataScopeItem, DataScopeQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/data-scopes';

export function createDataScope(data: Partial<DataScope> & { items?: Partial<DataScopeItem>[] }): Promise<ApiResponse<DataScope>> {
  return request.post(API_PREFIX, data);
}

export function getDataScopeList(params: DataScopeQueryParams): Promise<ApiResponse<PageResponse<DataScope>>> {
  return request.get(API_PREFIX, { params });
}

export function getDataScopeDetail(id: number): Promise<ApiResponse<DataScope & { items: DataScopeItem[] }>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateDataScope(id: number, data: Partial<DataScope> & { items?: Partial<DataScopeItem>[] }): Promise<ApiResponse<DataScope>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function deleteDataScope(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}

export function getCurrentUserDataScopes(): Promise<ApiResponse<any[]>> {
  return request.get('/api/iam/v1/current-user/data-scopes');
}
