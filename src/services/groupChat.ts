/**
 * Linkyun 群聊 API - 个人用户与 Agent 的 group chat
 * 文档: docs/API使用指南.md §4.6
 */
import { requestWithAuth, parseJsonResponse } from './api';
import { SYSTEM_AGENT_CODE } from '../config/api';
import { getAgentByCode } from './chat';

export interface GroupChatParticipant {
  id?: string | number;
  agent_id?: string | number;
  agent_name?: string;
  type?: 'agent' | 'user' | string;
  [key: string]: unknown;
}

export interface GroupChatInfo {
  id: string | number;
  title?: string;
  topic?: string;
  created_at?: string;
  participants?: GroupChatParticipant[];
  agent_ids?: (string | number)[];
  [key: string]: unknown;
}

export interface MessageItem {
  id?: string;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  attachments?: Array<{ type: string; token?: string; mime_type?: string; name?: string; [k: string]: unknown }>;
  created_at?: string;
  [key: string]: unknown;
}

/** 获取系统 Agent ID */
async function getSystemAgentId(): Promise<string> {
  const code = SYSTEM_AGENT_CODE?.trim();
  if (!code) throw new Error('未配置 VITE_SYSTEM_AGENT_CODE');
  const agent = await getAgentByCode(code);
  return agent.id;
}

/** 群聊列表 - GET /api/v1/user/group-chats
 * 获取与指定 Agent 相关的群聊历史（支持 agent_id 或 agent_ids 筛选）
 * @param workspace_id 可选，只返回群聊中所有参与 Agent 都属于指定 workspace 的群聊
 */
export async function listGroupChats(params?: {
  agent_id?: string | number;
  agent_ids?: (string | number)[];
  workspace_id?: string | number;
  limit?: number;
  offset?: number;
}): Promise<GroupChatInfo[]> {
  const query = new URLSearchParams();
  if (params?.agent_id != null) query.set('agent_id', String(params.agent_id));
  if (params?.agent_ids?.length) query.set('agent_ids', params.agent_ids.map(String).join(','));
  if (params?.workspace_id != null) query.set('workspace_id', String(params.workspace_id));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const url = `/api/v1/user/group-chats${query.toString() ? `?${query}` : ''}`;
  const res = await requestWithAuth(url, { method: 'GET' });
  const data = await parseJsonResponse<GroupChatInfo[] | Record<string, unknown>>(res);
  let list: GroupChatInfo[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    list =
      (d.items as GroupChatInfo[] | undefined) ??
      (d.group_chats as GroupChatInfo[] | undefined) ??
      (d.list as GroupChatInfo[] | undefined) ??
      (d.data as GroupChatInfo[] | undefined) ??
      (d.result as GroupChatInfo[] | undefined) ??
      (Object.values(d).find(Array.isArray) as GroupChatInfo[] | undefined) ??
      [];
  }
  return list;
}

/** 添加好友 - POST /api/v1/friends
 * 文档 §4.7：添加 Agent 为好友
 */
async function addFriend(agentId: string | number): Promise<void> {
  const id = typeof agentId === 'number' ? agentId : parseInt(String(agentId), 10);
  if (Number.isNaN(id)) throw new Error('无效的 Agent ID');
  const res = await requestWithAuth('/api/v1/friends', {
    method: 'POST',
    body: { agent_id: id },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = (err as { error?: { message?: string } })?.error?.message || '添加好友失败';
    if (!message.includes('already') && !message.includes('已经')) {
      throw new Error(message);
    }
  }
}

/** 创建群聊 - POST /api/v1/user/group-chats
 * 个人用户与 VITE_SYSTEM_AGENT_CODE 设定的 AI Agent 组成群组
 * API 要求: agent_ids (数字数组), topic, title
 * 如果 Agent 不是好友，会自动添加好友后重试
 */
export async function createGroupChat(agentId: string | number): Promise<GroupChatInfo> {
  const id = typeof agentId === 'number' ? agentId : parseInt(String(agentId), 10);
  if (Number.isNaN(id)) throw new Error('无效的 Agent ID');

  const doCreate = async (): Promise<GroupChatInfo> => {
    const res = await requestWithAuth('/api/v1/user/group-chats', {
      method: 'POST',
      body: {
        agent_ids: [id],
        topic: '新建对话',
        title: '新建对话',
      },
    });
    const data = await parseJsonResponse<GroupChatInfo>(res);
    if (!data?.id) throw new Error('创建群聊失败');
    return data;
  };

  try {
    return await doCreate();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.toLowerCase().includes('not a friend') || message.includes('不是好友')) {
      await addFriend(id);
      return await doCreate();
    }
    throw err;
  }
}

/** 群聊详情 - GET /api/v1/user/group-chats/{id} */
export async function getGroupChat(id: string): Promise<GroupChatInfo> {
  const res = await requestWithAuth(`/api/v1/user/group-chats/${id}`, { method: 'GET' });
  return parseJsonResponse<GroupChatInfo>(res);
}

/** 更新群聊（含标题）- PATCH /api/v1/user/group-chats/{id} */
export async function updateGroupChat(
  id: string,
  params: { title?: string; [key: string]: unknown }
): Promise<GroupChatInfo> {
  const res = await requestWithAuth(`/api/v1/user/group-chats/${id}`, {
    method: 'PATCH',
    body: params,
  });
  return parseJsonResponse<GroupChatInfo>(res);
}

/** 删除群聊 - DELETE /api/v1/user/group-chats/{id} */
export async function deleteGroupChat(id: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/user/group-chats/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || '删除群聊失败');
  }
}

/** 群聊消息列表 - GET /api/v1/user/group-chats/{id}/messages */
export async function getGroupChatMessages(id: string): Promise<MessageItem[]> {
  const res = await requestWithAuth(`/api/v1/user/group-chats/${id}/messages`, { method: 'GET' });
  const data = await parseJsonResponse<MessageItem[] | { messages?: MessageItem[]; items?: MessageItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.messages ?? data?.items ?? [];
}

/** 发送群聊消息 - POST /api/v1/user/group-chats/{id}/messages
 * 文档 §4.3：attachments 只需 { type, token }
 */
export async function sendGroupChatMessage(
  id: string,
  params: {
    content?: string;
    attachments?: Array<{ type: string; token: string }>;
    stream?: boolean;
  }
): Promise<MessageItem | { messages?: MessageItem[] }> {
  const res = await requestWithAuth(`/api/v1/user/group-chats/${id}/messages`, {
    method: 'POST',
    body: {
      content: params.content || '',
      ...(params.attachments?.length && { attachments: params.attachments }),
      stream: params.stream ?? false,
    },
  });
  return parseJsonResponse<MessageItem | { messages?: MessageItem[] }>(res);
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

/** 从消息列表中提取最后一条 assistant 的有效回复 */
export function extractAssistantContentFromMessages(messages: MessageItem[]): string | null {
  const last = [...messages].reverse().find((m) => m?.role === 'assistant' && typeof m?.content === 'string' && (m.content as string).trim());
  return last ? (last.content as string).trim() : null;
}

/** 轮询等待 AI 回复，最多等待 timeoutMs 毫秒
 * @param minMessageCount 本地已有消息数（含刚发送的用户消息），只有 API 返回更多且最后一条为 assistant 时才视为新回复
 */
export async function pollForAssistantResponse(
  chatId: string,
  timeoutMs: number = POLL_TIMEOUT_MS,
  minMessageCount: number = 0
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const messages = await getGroupChatMessages(chatId);
    if (messages.length <= minMessageCount) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }
    const last = messages[messages.length - 1];
    if (last?.role !== 'assistant' || typeof last?.content !== 'string' || !(last.content as string).trim()) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }
    return (last.content as string).trim();
  }
  return null;
}

/**
 * 过滤群聊列表，只保留：
 * 1. participants 中有且只有一个 Agent 参与者
 * 2. 且该 Agent 的 id 与指定的 systemAgentId 一致
 */
export function filterSingleAgentGroupChats(
  groups: GroupChatInfo[],
  systemAgentId: string | number
): GroupChatInfo[] {
  const targetId = String(systemAgentId);

  return groups.filter((g) => {
    // 优先使用 participants 字段
    if (Array.isArray(g.participants) && g.participants.length > 0) {
      // 筛选出 agent 类型的参与者
      const agentParticipants = g.participants.filter(
        (p) => p.type === 'agent' || p.agent_id != null
      );
      // 必须有且只有一个 agent 参与者
      if (agentParticipants.length !== 1) return false;
      // 该 agent 的 id 必须与系统 agent id 一致
      const participant = agentParticipants[0];
      const participantAgentId = String(participant.agent_id ?? participant.id ?? '');
      return participantAgentId === targetId;
    }

    // 回退：使用 agent_ids 字段
    if (Array.isArray(g.agent_ids)) {
      // 必须有且只有一个 agent
      if (g.agent_ids.length !== 1) return false;
      return String(g.agent_ids[0]) === targetId;
    }

    // 无法判断时不显示
    return false;
  });
}

export { getSystemAgentId };
