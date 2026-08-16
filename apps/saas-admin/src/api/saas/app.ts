// 应用管理 API
import { request } from '@logistics/request';
import type { App, AppQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/saas/v1/apps';

// 创建应用
export function createApp(data: Partial<App>): Promise<ApiResponse<App>> {
  return request.post(API_PREFIX, data);
}

// 应用列表
export function getAppList(params?: AppQueryParams): Promise<ApiResponse<PageResponse<App>>> {
  return request.get(API_PREFIX, { params });
}

// 应用详情
export function getAppDetail(id: number): Promise<ApiResponse<App>> {
  return request.get(`${API_PREFIX}/${id}`);
}

// 修改应用
export function updateApp(id: number, data: Partial<App>): Promise<ApiResponse<App>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

// 启用应用
export function enableApp(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

// 停用应用
export function disableApp(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

// 删除应用
export function deleteApp(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
