// 会话管理 API
import { request } from '@logistics/request';
import type { Session, SessionQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/sessions';

export function getSessionList(params: SessionQueryParams): Promise<ApiResponse<PageResponse<Session>>> {
  return request.get(API_PREFIX, { params });
}

export function revokeSession(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/revoke`);
}
