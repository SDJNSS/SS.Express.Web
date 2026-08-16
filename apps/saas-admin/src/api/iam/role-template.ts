// 角色模板管理 API
import { request } from '@logistics/request';
import type { RoleTemplate, RoleTemplateQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/role-templates';

export function createRoleTemplate(data: Partial<RoleTemplate>): Promise<ApiResponse<RoleTemplate>> {
  return request.post(API_PREFIX, data);
}

export function getRoleTemplateList(params?: RoleTemplateQueryParams): Promise<ApiResponse<PageResponse<RoleTemplate>>> {
  return request.get(API_PREFIX, { params });
}

export function getRoleTemplateDetail(id: number): Promise<ApiResponse<RoleTemplate>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateRoleTemplate(id: number, data: Partial<RoleTemplate>): Promise<ApiResponse<RoleTemplate>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function deleteRoleTemplate(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}

export function createRoleFromTemplate(templateId: number, tenantId: number, data: any): Promise<ApiResponse<any>> {
  return request.post(`${API_PREFIX}/${templateId}/create-role`, { tenantId, ...data });
}
