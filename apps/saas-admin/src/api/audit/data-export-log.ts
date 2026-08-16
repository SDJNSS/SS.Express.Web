// 数据导出审计 API
import { request } from '@logistics/request';
import type { DataExportLog, DataExportLogQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/audit/v1/data-export-logs';

export function getDataExportLogList(params: DataExportLogQueryParams): Promise<ApiResponse<PageResponse<DataExportLog>>> {
  return request.get(API_PREFIX, { params });
}

export function getDataExportLogDetail(id: number): Promise<ApiResponse<DataExportLog>> {
  return request.get(`${API_PREFIX}/${id}`);
}
