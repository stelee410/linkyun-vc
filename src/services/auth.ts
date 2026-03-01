/**
 * Linkyun 认证 API - 登录、注册
 * 文档: docs/API使用指南.md §3.2 §3.3
 */
import { getApiUrl } from '../config/api';
import type { ApiResponse, AuthData } from '../types/auth';

export interface LoginParams {
  username: string;  // 用户名或邮箱
  password: string;
  workspace_code?: string;
}

export interface RegisterParams {
  username: string;  // 3-100 字符
  email: string;
  password: string;  // 至少 8 位
  invitation_code: string;  // 必填
}

async function request<T = AuthData>(
  url: string,
  options: RequestInit & { body?: object }
): Promise<ApiResponse<T>> {
  const { body, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers as Record<string, string>),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    return {
      success: false,
      error: { message: (json as { error?: { message?: string } }).error?.message || `HTTP ${res.status}` },
    };
  }
  return json;
}

/** 登录 - POST /api/v1/auth/login */
export async function login(params: LoginParams): Promise<ApiResponse<AuthData>> {
  return request<AuthData>(getApiUrl('/api/v1/auth/login'), {
    method: 'POST',
    body: {
      username: params.username,
      password: params.password,
      ...(params.workspace_code && { workspace_code: params.workspace_code }),
    },
  });
}

/** 注册 - POST /api/v1/auth/register */
export async function register(params: RegisterParams): Promise<ApiResponse<AuthData>> {
  return request<AuthData>(getApiUrl('/api/v1/auth/register'), {
    method: 'POST',
    body: {
      username: params.username,
      email: params.email,
      password: params.password,
      invitation_code: params.invitation_code,
    },
  });
}
