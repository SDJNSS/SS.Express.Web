// 操作审计 API
import { request } from '@logistics/request';
import type { OperationLog, OperationLogQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/audit/v1/operation-logs';

export function getOperationLogList(params: OperationLogQueryParams): Promise<ApiResponse<PageResponse<OperationLog>>> {
  return request.get(API_PREFIX, { params });
}

export function getOperationLogDetail(id: number): Promise<ApiResponse<OperationLog>> {
  return request.get(`${API_PREFIX}/${id}`);
}
