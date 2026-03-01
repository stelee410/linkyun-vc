/**
 * Agent 管理 API
 * 文档: docs/API使用指南.md §4.2
 */
import { requestWithAuth, parseJsonResponse } from './api';

export interface AgentInfo {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  model?: string;
  status?: string;
  system_prompt?: string;
  rag_config?: { knowledge_base_ids?: string[] } | null;
  knowledge_base_id?: number | null;
  avatar_url?: string;
  avatar_filename?: string;
  avatar?: string | { url?: string; filename?: string };
  metadata?: { avatar?: string; [key: string]: unknown };
  config?: { metadata?: { avatar?: string }; [key: string]: unknown };
  pre_skills?: PreSkillItem[];
  [key: string]: unknown;
}

/** 从 Agent 提取头像 URL，兼容多种 API 返回结构（含 config.metadata.avatar） */
export function getAgentAvatarUrl(
  agent: AgentInfo | null | undefined,
  baseUrl: string
): string | null {
  if (!agent) return null;
  const a = agent as Record<string, unknown>;
  // 完整 URL
  const rawUrl = a.avatar_url ?? (typeof a.avatar === 'string' ? a.avatar : null)
    ?? (a.avatar && typeof a.avatar === 'object' && (a.avatar as { url?: string }).url);
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) return rawUrl;
  // 仅文件名，拼接 /api/v1/avatars/{filename}（含 config.metadata.avatar）
  const metadata = a.metadata as Record<string, unknown> | undefined;
  const configMeta = (a.config as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
  const fn = a.avatar_filename ?? a.avatar_file
    ?? (metadata?.avatar as string)
    ?? (configMeta?.avatar as string)
    ?? (a.avatar && typeof a.avatar === 'object' && (a.avatar as { filename?: string }).filename);
  if (fn && typeof fn === 'string') {
    const b = (baseUrl || '').replace(/\/$/, '');
    if (!b) return null;
    return `${b}/api/v1/avatars/${encodeURIComponent(fn)}`;
  }
  return null;
}

export interface PreSkillItem {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

/** 从任意结构中提取头像文件名（含 data.config.metadata.avatar） */
function extractAvatarFilename(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const meta = o.metadata as Record<string, unknown> | undefined;
  const configMeta = (o.config as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
  const av = meta?.avatar ?? configMeta?.avatar;
  if (typeof av === 'string') return av;
  if (av && typeof av === 'object' && typeof (av as { filename?: string }).filename === 'string') return (av as { filename: string }).filename;
  return (o.avatar_filename ?? o.avatar_file ?? null) as string | null;
}

/** 获取单个 Agent - GET /api/v1/agents/{id} */
export async function getAgent(id: string): Promise<AgentInfo> {
  const res = await requestWithAuth(`/api/v1/agents/${id}`, { method: 'GET' });
  const data = await parseJsonResponse<AgentInfo | { agent?: AgentInfo; metadata?: Record<string, unknown> }>(res);
  const raw = data as { agent?: AgentInfo; metadata?: Record<string, unknown> };
  const agent = (raw.agent ?? data) as AgentInfo;
  if (!agent || typeof agent !== 'object') throw new Error('无效的 Agent 数据');
  const a = agent as Record<string, unknown>;
  if (!a.metadata && raw.metadata) a.metadata = raw.metadata;
  const fn = extractAvatarFilename(agent) ?? extractAvatarFilename(raw);
  if (fn && typeof fn === 'string') {
    if (!a.metadata) a.metadata = { avatar: fn };
    else if (typeof a.metadata === 'object') (a.metadata as Record<string, unknown>).avatar = fn;
    const cfg = a.config as Record<string, unknown> | undefined;
    if (cfg && typeof cfg === 'object' && !(cfg.metadata as Record<string, unknown>)?.avatar) {
      if (!cfg.metadata) cfg.metadata = { avatar: fn };
      else (cfg.metadata as Record<string, unknown>).avatar = fn;
    }
  }
  return agent as AgentInfo;
}

/** Agent 列表 - GET /api/v1/agents */
export async function listAgents(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AgentInfo[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = qs ? `/api/v1/agents?${qs}` : '/api/v1/agents';
  const res = await requestWithAuth(url, { method: 'GET' });
  const data = await parseJsonResponse<AgentInfo[] | { agents?: AgentInfo[]; items?: AgentInfo[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.agents ?? data?.items ?? [];
}

/** 更新 Agent - PUT /api/v1/agents/{id} */
export async function updateAgent(
  id: string,
  body: Partial<{
    name: string;
    code: string;
    description: string;
    system_prompt: string;
    status: 'draft' | 'active';
    rag_config: { knowledge_base_ids?: string[] } | null;
    knowledge_base_id: number | null;
  }>
): Promise<AgentInfo> {
  const res = await requestWithAuth(`/api/v1/agents/${id}`, {
    method: 'PUT',
    body: body as Record<string, unknown>,
  });
  return parseJsonResponse<AgentInfo>(res);
}

/** 上传 Agent 头像 - POST /api/v1/agents/{id}/avatar，multipart 字段 avatar */
export async function uploadAgentAvatar(id: string, file: File): Promise<AgentInfo> {
  const form = new FormData();
  form.append('avatar', file);
  const res = await requestWithAuth(`/api/v1/agents/${id}/avatar`, {
    method: 'POST',
    body: form,
  });
  return parseJsonResponse<AgentInfo>(res);
}

/** 删除 Agent 头像 - DELETE /api/v1/agents/{id}/avatar */
export async function deleteAgentAvatar(id: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/agents/${id}/avatar`, { method: 'DELETE' });
  await parseJsonResponse(res);
}

/** 获取 Agent 对话前技能 - GET /api/v1/agents/{id}/pre-skills */
export async function getAgentPreSkills(id: string): Promise<PreSkillItem[]> {
  const res = await requestWithAuth(`/api/v1/agents/${id}/pre-skills`, { method: 'GET' });
  const data = await parseJsonResponse<PreSkillItem[] | { pre_skills?: PreSkillItem[]; skills?: PreSkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.pre_skills ?? data?.skills ?? [];
}

/** 更新 Agent 对话前技能 - PUT /api/v1/agents/{id}/pre-skills */
export async function putAgentPreSkills(id: string, skills: PreSkillItem[]): Promise<PreSkillItem[]> {
  const res = await requestWithAuth(`/api/v1/agents/${id}/pre-skills`, {
    method: 'PUT',
    body: { pre_skills: skills } as Record<string, unknown>,
  });
  const data = await parseJsonResponse<PreSkillItem[] | { pre_skills?: PreSkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.pre_skills ?? [];
}

/** 添加内置图像上传技能 - POST /api/v1/agents/{id}/pre-skills/add-builtin-image-upload */
export async function addPreSkillImageUpload(id: string): Promise<PreSkillItem[]> {
  const res = await requestWithAuth(`/api/v1/agents/${id}/pre-skills/add-builtin-image-upload`, {
    method: 'POST',
  });
  const data = await parseJsonResponse<PreSkillItem[] | { pre_skills?: PreSkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.pre_skills ?? [];
}

/** 添加内置文档上传技能 - POST /api/v1/agents/{id}/pre-skills/add-builtin-document-upload */
export async function addPreSkillDocumentUpload(id: string): Promise<PreSkillItem[]> {
  const res = await requestWithAuth(`/api/v1/agents/${id}/pre-skills/add-builtin-document-upload`, {
    method: 'POST',
  });
  const data = await parseJsonResponse<PreSkillItem[] | { pre_skills?: PreSkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.pre_skills ?? [];
}

/** 创建 Agent - POST /api/v1/agents */
export async function createAgent(params: {
  code: string;
  name: string;
  description?: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  agent_type?: 'cloud' | 'edge';
  memory_enabled?: boolean;
  status?: 'draft' | 'active';
}): Promise<AgentInfo> {
  const res = await requestWithAuth('/api/v1/agents', {
    method: 'POST',
    body: {
      code: params.code,
      name: params.name,
      description: params.description ?? '',
      model: params.model ?? '',
      system_prompt: params.system_prompt ?? '',
      temperature: params.temperature ?? 0.7,
      agent_type: params.agent_type ?? 'cloud',
      memory_enabled: params.memory_enabled ?? false,
      status: params.status ?? 'draft',
      examples: [],
      skills: [],
      rag_config: null,
      workspace_id: null,
      llm_provider: '',
      llm_temperature: null,
    },
  });
  const data = await parseJsonResponse<AgentInfo>(res);
  if (!data?.id) throw new Error('创建 Agent 失败');
  return data;
}

/** 将姓名转为合规的 code（2-64 字符，小写字母、数字、下划线、连字符），并确保唯一 */
export function nameToCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, ''); // 仅保留字母、数字、-、_
  const base = slug && slug.length >= 2 ? slug : 'agent';
  return `${base}-${Date.now().toString(36)}`.slice(0, 64);
}
