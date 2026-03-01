/**
 * 整站 API 请求封装 - 统一 base_url 与 X-API-Key
 * 需认证的 Creator 接口请使用 requestWithAuth
 */
import { getApiUrl, WORKSPACE_CODE } from '../config/api';
import { getApiKey } from '../lib/authStorage';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: object | FormData;
}

/** 带 X-API-Key 的请求（Creator API）；未登录时无 Key */
export async function requestWithAuth(path: string, options: RequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : getApiUrl(path);
  const apiKey = getApiKey();
  const headers = new Headers(options.headers);
  if (apiKey) headers.set('X-API-Key', apiKey);
  if (WORKSPACE_CODE?.trim()) headers.set('X-Workspace-Code', WORKSPACE_CODE.trim());
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const body = options.body instanceof FormData
    ? options.body
    : (options.body ? JSON.stringify(options.body) : undefined);
  return fetch(url, { ...options, headers, body });
}

/** 解析 JSON 响应；若 HTTP 非 2xx 或 success:false 则抛错 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if ((json as { success?: boolean }).success === false) {
    const msg = (json as { error?: { message?: string } })?.error?.message || '请求失败';
    throw new Error(msg);
  }
  return (json as { data?: T }).data !== undefined ? (json as { data: T }).data : (json as T);
}
