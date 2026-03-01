/**
 * 工作空间 API - 用户工作空间列表、加入、切换
 * 文档: docs/API使用指南.md §4.3
 */
import { requestWithAuth, parseJsonResponse } from './api';

export interface UserWorkspaceItem {
  workspace?: { id: string; code: string; name?: string };
  role?: string;
  [key: string]: unknown;
}

/** 当前用户的工作空间及角色 - GET /api/v1/user/workspaces */
export async function getUserWorkspaces(): Promise<UserWorkspaceItem[]> {
  const res = await requestWithAuth('/api/v1/user/workspaces', { method: 'GET' });
  const data = await parseJsonResponse<UserWorkspaceItem[] | { workspaces?: UserWorkspaceItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.workspaces ?? [];
}

/** 通过邀请码加入工作空间 - POST /api/v1/user/workspace/join */
export async function joinWorkspace(inviteCode: string): Promise<unknown> {
  const res = await requestWithAuth('/api/v1/user/workspace/join', {
    method: 'POST',
    body: { invite_code: inviteCode },
  });
  return parseJsonResponse(res);
}

/** 切换当前工作空间 - POST /api/v1/user/workspace/switch */
export async function switchWorkspace(workspaceCode: string): Promise<unknown> {
  const res = await requestWithAuth('/api/v1/user/workspace/switch', {
    method: 'POST',
    body: { workspace_code: workspaceCode },
  });
  return parseJsonResponse(res);
}
