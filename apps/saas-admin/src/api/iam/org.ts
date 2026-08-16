// 组织架构管理 API
import { request } from '@logistics/request';
import type { Org, OrgQueryParams, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/orgs';

export function createOrg(data: Partial<Org>): Promise<ApiResponse<Org>> {
  return request.post(API_PREFIX, data);
}

export function getOrgTree(tenantId: number): Promise<ApiResponse<Org[]>> {
  return request.get(`${API_PREFIX}/tree`, { params: { tenantId } });
}

export function getOrgDetail(id: number): Promise<ApiResponse<Org>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateOrg(id: number, data: Partial<Org>): Promise<ApiResponse<Org>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function enableOrg(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

export function disableOrg(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function deleteOrg(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}

export function getOrgMembers(id: number): Promise<ApiResponse<any[]>> {
  return request.get(`${API_PREFIX}/${id}/members`);
}
