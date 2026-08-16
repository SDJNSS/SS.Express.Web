// 用户管理 API
import { request } from '@logistics/request';
import type { User, UserQueryParams, PageResponse, ApiResponse } from '@/types';

const API_PREFIX = '/api/iam/v1/users';

export function createUser(data: Partial<User>): Promise<ApiResponse<User>> {
  return request.post(API_PREFIX, data);
}

export function getUserList(params: UserQueryParams): Promise<ApiResponse<PageResponse<User>>> {
  return request.get(API_PREFIX, { params });
}

export function getUserDetail(id: number): Promise<ApiResponse<User>> {
  return request.get(`${API_PREFIX}/${id}`);
}

export function updateUser(id: number, data: Partial<User>): Promise<ApiResponse<User>> {
  return request.put(`${API_PREFIX}/${id}`, data);
}

export function disableUser(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/disable`);
}

export function lockUser(id: number): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/lock`);
}

export function resetPassword(id: number, newPassword: string): Promise<ApiResponse<void>> {
  return request.post(`${API_PREFIX}/${id}/reset-password`, { newPassword });
}

export function deleteUser(id: number): Promise<ApiResponse<void>> {
  return request.delete(`${API_PREFIX}/${id}`);
}
