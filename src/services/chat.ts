/**
 * Linkyun 会话/消息 API - 主题对话
 * 文档: docs/API使用指南.md §4.4
 * 每个新对话创建一个新 Session（主题），消息通过 Session 发送
 */
import { requestWithAuth, parseJsonResponse } from './api';
import { SYSTEM_AGENT_CODE, SYSTEM_SERVICE_AGENT_CODE } from '../config/api';
import { getStoredUser } from '../lib/authStorage';

export interface AgentInfo {
  id: string;
  code?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SessionInfo {
  id: string;
  agent_id?: string;
  user_id?: string;
  [key: string]: unknown;
}

export interface MessageItem {
  id?: string;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  attachments?: Array<{ type: string; token?: string; mime_type?: string; name?: string; [k: string]: unknown }>;
  [key: string]: unknown;
}

/** 按 code 获取 Agent - GET /api/v1/agents/by-code/{code} */
export async function getAgentByCode(code: string): Promise<AgentInfo> {
  const res = await requestWithAuth(`/api/v1/agents/by-code/${encodeURIComponent(code)}`, { method: 'GET' });
  const data = await parseJsonResponse<AgentInfo>(res);
  if (!data?.id) throw new Error('Agent 不存在');
  return data;
}

/** 获取默认系统 Agent 的 ID（需配置 VITE_SYSTEM_AGENT_CODE） */
export async function getSystemAgentId(): Promise<string> {
  const code = SYSTEM_AGENT_CODE?.trim();
  if (!code) throw new Error('未配置 VITE_SYSTEM_AGENT_CODE');
  const agent = await getAgentByCode(code);
  return agent.id;
}

/** 获取 simulate 服务用 Agent 的 ID（生成聊天标题，需配置 VITE_SYSTEM_SERVICE_AGENT_CODE） */
export async function getSystemServiceAgentId(): Promise<string> {
  const code = SYSTEM_SERVICE_AGENT_CODE?.trim();
  if (!code) throw new Error('未配置 VITE_SYSTEM_SERVICE_AGENT_CODE');
  const agent = await getAgentByCode(code);
  return agent.id;
}

/** 获取会话列表 - GET /api/v1/sessions */
export async function listSessions(params?: {
  agent_id?: string;
  limit?: number;
  offset?: number;
}): Promise<SessionInfo[]> {
  const query = new URLSearchParams();
  if (params?.agent_id) query.set('agent_id', params.agent_id);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const url = `/api/v1/sessions${query.toString() ? `?${query}` : ''}`;
  const res = await requestWithAuth(url, { method: 'GET' });
  const data = await parseJsonResponse<SessionInfo[] | { sessions?: SessionInfo[]; items?: SessionInfo[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.sessions ?? data?.items ?? [];
}

/** 获取会话详情 - GET /api/v1/sessions/{id} */
export async function getSession(sessionId: string): Promise<SessionInfo> {
  const res = await requestWithAuth(`/api/v1/sessions/${sessionId}`, { method: 'GET' });
  return parseJsonResponse<SessionInfo>(res);
}

/** 删除会话 - DELETE /api/v1/sessions/{id} */
export async function deleteSessionApi(sessionId: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || '删除会话失败');
  }
}

/** 创建会话（新主题）- POST /api/v1/sessions */
export async function createSession(agentId: string): Promise<SessionInfo> {
  const user = getStoredUser();
  const userId = user?.id;
  if (!userId) throw new Error('请先登录');

  const res = await requestWithAuth('/api/v1/sessions', {
    method: 'POST',
    body: { agent_id: agentId, user_id: userId },
  });
  const data = await parseJsonResponse<SessionInfo>(res);
  if (!data?.id) throw new Error('创建会话失败');
  return data;
}

/** 发送消息 - POST /api/v1/sessions/{session_id}/messages
 * 文档 §4.3：attachments 只需 { type, token }
 */
export async function sendSessionMessage(
  sessionId: string,
  params: {
    content?: string;
    attachments?: Array<{ type: string; token: string }>;
    stream?: boolean;
  }
): Promise<MessageItem | { messages?: MessageItem[] }> {
  const res = await requestWithAuth(`/api/v1/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: {
      content: params.content || '',
      ...(params.attachments?.length && { attachments: params.attachments }),
      stream: params.stream ?? false,
    },
  });
  return parseJsonResponse<MessageItem | { messages?: MessageItem[] }>(res);
}

/** 获取会话消息列表 - GET /api/v1/sessions/{id}/messages */
export async function getSessionMessages(sessionId: string): Promise<MessageItem[]> {
  const res = await requestWithAuth(`/api/v1/sessions/${sessionId}/messages`, { method: 'GET' });
  const data = await parseJsonResponse<MessageItem[] | { messages?: MessageItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.messages ?? [];
}

/** Simple Chat 请求参数 */
export interface SimpleChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/** Simple Chat 响应 */
export interface SimpleChatResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

/**
 * 简单对话 - POST /api/v1/chat
 * 文档 §4.8：直接使用系统配置的 LLM 进行对话，不创建会话、不存库
 */
export async function simpleChat(params: SimpleChatRequest): Promise<SimpleChatResponse> {
  const res = await requestWithAuth('/api/v1/chat', {
    method: 'POST',
    body: params,
  });
  const data = await parseJsonResponse<{ success?: boolean; data?: SimpleChatResponse } & SimpleChatResponse>(res);
  // 兼容两种响应格式：{ success, data: {...} } 或直接 { content, model, usage }
  if (data?.data) {
    return data.data;
  }
  return {
    content: data?.content ?? '',
    model: data?.model ?? '',
    usage: data?.usage,
  };
}

/**
 * 根据前 N 条消息生成对话标题 - 使用 Simple Chat API
 * 文档 §4.8：使用系统 LLM，无需 Agent ID
 */
export async function generateSessionTitle(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const first3 = messages.slice(0, 3);
  const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `根据以下对话内容，生成一个简短的标题（不超过10个字）。只返回标题，不要解释或标点。\n\n${first3.map(m => `${m.role}: ${m.content}`).join('\n')}`,
    },
  ];

  const data = await simpleChat({
    messages: chatMessages,
    system_prompt: '你是一个帮助生成对话标题的助手。只返回简短的标题，不要任何解释。',
    temperature: 0.3,
    max_tokens: 1024,
  });

  return data.content.trim() || '新对话';
}
