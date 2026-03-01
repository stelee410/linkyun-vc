/**
 * Creator 个人资料 API
 * 文档: docs/API使用指南.md §4.1
 */
import { requestWithAuth, parseJsonResponse } from './api';

export interface CreatorProfile {
  id?: string;
  username?: string;
  full_name?: string;
  description?: string;
  avatar_url?: string;
  [key: string]: unknown;
}

/** 获取当前创作者资料 - GET /api/v1/profile */
export async function getProfile(): Promise<CreatorProfile> {
  const res = await requestWithAuth('/api/v1/profile', { method: 'GET' });
  return parseJsonResponse<CreatorProfile>(res);
}

/** 更新资料 - PUT /api/v1/profile，Body: full_name, username, description */
export async function updateProfile(params: {
  full_name?: string;
  username?: string;
  description?: string;
}): Promise<CreatorProfile> {
  const res = await requestWithAuth('/api/v1/profile', {
    method: 'PUT',
    body: params,
  });
  return parseJsonResponse<CreatorProfile>(res);
}
