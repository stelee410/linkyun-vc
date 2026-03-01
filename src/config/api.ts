/**
 * Linkyun API 配置 - 整站与生产系统统一 base_url
 * 文档: docs/API使用指南.md
 * 可选：在 .env.local 中设置 VITE_API_BASE_URL 覆盖（如本地测试服）
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://linkyun.co';

/** 头像资源基地址（GET /api/v1/avatars/{filename}），默认 api.linkyun.co */
export const AVATAR_BASE_URL = import.meta.env.VITE_AVATAR_BASE_URL ?? 'https://api.linkyun.co';

/** 应用期望的工作空间 code；登录后会检查并可选地通过 VITE_WORKSPACE_JOIN_CODE 加入 */
export const WORKSPACE_CODE = import.meta.env.VITE_WORKSPACE_CODE as string | undefined;
/** 用于加入上述工作空间的邀请码；当用户不在 WORKSPACE_CODE 时使用 */
export const WORKSPACE_JOIN_CODE = import.meta.env.VITE_WORKSPACE_JOIN_CODE as string | undefined;
/** 默认对话的 AI Agent code（用户端）；每个新对话会创建新主题/会话 */
export const SYSTEM_AGENT_CODE = import.meta.env.VITE_SYSTEM_AGENT_CODE as string | undefined;

/** 律师端系统助手 AI Agent code；律师端首页聊天使用 */
export const SYSTEM_ASSISTANT_AGENT_CODE = import.meta.env.VITE_SYSTEM_ASSISTANT_AGENT_CODE as string | undefined;

/** 生成聊天标题用的 simulate 服务 AI Agent code */
export const SYSTEM_SERVICE_AGENT_CODE = import.meta.env.VITE_SYSTEM_SERVICE_AGENT_CODE as string | undefined;

/** 注册邀请码 */
export const REGISTER_INVITATION_CODE = import.meta.env.VITE_REGISTER_INVITATION_CODE as string | undefined;

export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

export const API = {
  auth: {
    login: () => getApiUrl('/api/v1/auth/login'),
    register: () => getApiUrl('/api/v1/auth/register'),
  },
  health: () => getApiUrl('/health'),
  ready: () => getApiUrl('/ready'),
} as const;
