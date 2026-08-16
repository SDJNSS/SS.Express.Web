// 功能管理 API
import { request } from '@logistics/request';
import type { Feature, FeatureQueryParams, ApiResponse } from '@/types';

const API_PREFIX = '/api/saas/v1/features';

// 创建功能
export function createFeature(data: Partial<Feature>): Promise<ApiResponse<Feature>> {
  return request.post(API_PREFIX, data);
}

// 获取应用功能树
export function getFeatureTree(appId: number): Promise<ApiResponse<Feature[]>> {
  return request.get(`/api/saas/v1/apps/${appId}/features/tree`);
}

// 功能详情
export function getFeatureDetail(id: number): Promise<ApiResponse<Feature>> {
  return request.get(`${API_PREFIX}/${id}`);
}

// 修改功能
export function updateFeature(id: number, data: Partial<Feature>): Promise<ApiResponse<Feature>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

// 启用功能
export function enableFeature(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

// 停用功能
export function disableFeature(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

// 删除功能
export function deleteFeature(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
