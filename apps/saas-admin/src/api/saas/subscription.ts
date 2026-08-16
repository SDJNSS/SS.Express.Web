// 订阅管理 API
import { request } from '@logistics/request';
import type { Subscription, SubscriptionQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/saas/v1/subscriptions';

// 创建订阅
export function createSubscription(data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
  return request.post(API_PREFIX, data);
}

// 查询订阅
export function getSubscriptionList(params?: SubscriptionQueryParams): Promise<ApiResponse<PageResponse<Subscription>>> {
  return request.get(API_PREFIX, { params });
}

// 订阅详情
export function getSubscriptionDetail(id: number): Promise<ApiResponse<Subscription>> {
  return request.get(`${API_PREFIX}/${id}`);
}

// 修改订阅
export function updateSubscription(id: number, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

// 续费
export function renewSubscription(id: number, endAt: string): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/renew`, { endAt });
}

// 变更套餐
export function changePlan(id: number, planId: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/change-plan`, { planId });
}

// 冻结订阅
export function freezeSubscription(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/freeze`);
}

// 取消订阅
export function cancelSubscription(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/cancel`);
}

// 当前租户可访问应用
export function getCurrentTenantApps(): Promise<ApiResponse<any[]>> {
  return request.get('/api/saas/v1/current-tenant/apps');
}

// 当前租户可访问功能
export function getCurrentTenantFeatures(): Promise<ApiResponse<any[]>> {
  return request.get('/api/saas/v1/current-tenant/features');
}
