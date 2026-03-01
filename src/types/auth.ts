/**
 * Linkyun 认证相关类型 - 与 API 使用指南一致
 */

/** 登录/注册成功后的业务数据 */
export interface AuthData {
  api_key: string;
  creator?: { id: string; username?: string; [k: string]: unknown };
  account?: unknown;
  user?: { id: string; username?: string; [k: string]: unknown };
  workspace?: { id: string; code?: string; [k: string]: unknown };
}

/** 接口通用成功响应 */
export interface ApiSuccess<T = AuthData> {
  success: true;
  data: T;
}

/** 接口错误响应 */
export interface ApiError {
  success: false;
  error: { message: string };
}

export type ApiResponse<T = AuthData> = ApiSuccess<T> | ApiError;

export function isApiError(r: ApiResponse): r is ApiError {
  return r && (r as ApiError).success === false && 'error' in (r as ApiError);
}
