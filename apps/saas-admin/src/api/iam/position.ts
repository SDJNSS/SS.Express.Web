// 岗位管理 API
import { request } from '@logistics/request';
import type { Position, PositionQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/positions';

export function createPosition(data: Partial<Position>): Promise<ApiResponse<Position>> {
  return request.post(API_PREFIX, data);
}

export function getPositionList(params: PositionQueryParams): Promise<ApiResponse<PageResponse<Position>>> {
  return request.get(API_PREFIX, { params });
}

export function getPositionDetail(id: number): Promise<ApiResponse<Position>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updatePosition(id: number, data: Partial<Position>): Promise<ApiResponse<Position>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function enablePosition(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/enable`);
}

export function disablePosition(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function deletePosition(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}

export function getPositionMembers(id: number): Promise<ApiResponse<any[]>> {
  return request.get(`${API_PREFIX}/${id}/members`);
}
