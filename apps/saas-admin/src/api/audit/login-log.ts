// 登录审计 API
import { request } from '@logistics/request';
import type { LoginLog, LoginLogQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/audit/v1/login-logs';

export function getLoginLogList(params: LoginLogQueryParams): Promise<ApiResponse<PageResponse<LoginLog>>> {
  return request.get(API_PREFIX, { params });
}

export function getLoginLogDetail(id: number): Promise<ApiResponse<LoginLog>> {
  return request.get(`${API_PREFIX}/${id}`);
}
