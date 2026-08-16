// 套餐管理 API
import { request } from '@logistics/request';
import type { Plan, PlanQueryParams, PlanFeature, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/saas/v1/plans';

// 创建套餐
export function createPlan(data: Partial<Plan>): Promise<ApiResponse<Plan>> {
  return request.post(API_PREFIX, data);
}

// 套餐列表
export function getPlanList(params?: PlanQueryParams): Promise<ApiResponse<PageResponse<Plan>>> {
  return request.get(API_PREFIX, { params });
}

// 套餐详情
export function getPlanDetail(id: number): Promise<ApiResponse<Plan & { features: PlanFeature[] }>> {
  return request.get(`${API_PREFIX}/${id}`);
}

// 修改套餐
export function updatePlan(id: number, data: Partial<Plan>): Promise<ApiResponse<Plan>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

// 配置套餐功能
export function configurePlanFeatures(
  planId: number,
  features: { appId: number; featureId: number; grantType: string }[]
): Promise<ApiResponse<void>> {
  return request.put(`${API_PREFIX}/${planId}/features`, { features });
}

// 启用套餐
export function enablePlan(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

// 停用套餐
export function disablePlan(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

// 删除套餐
export function deletePlan(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
