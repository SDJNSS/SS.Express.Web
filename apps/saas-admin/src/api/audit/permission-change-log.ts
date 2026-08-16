// 权限变更审计 API
import { request } from '@logistics/request';
import type { PermissionChangeLog, PermissionChangeLogQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/audit/v1/permission-change-logs';

export function getPermissionChangeLogList(params: PermissionChangeLogQueryParams): Promise<ApiResponse<PageResponse<PermissionChangeLog>>> {
  return request.get(API_PREFIX, { params });
}

export function getPermissionChangeLogDetail(id: number): Promise<ApiResponse<PermissionChangeLog>> {
  return request.get(`${API_PREFIX}/${id}`);
}
