/**
 * 知识库 API
 * 文档: docs/API使用指南.md §4.8
 */
import { requestWithAuth, parseJsonResponse } from './api';

export interface KnowledgeBaseInfo {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  document_count?: number;
  total_size?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DocumentInfo {
  id: string;
  name?: string;
  filename?: string;
  file_type?: string;
  file_size?: number;
  char_count?: number;
  status?: string;
  chunk_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** 格式化相对时间 */
export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-CN');
}

/** 格式化状态显示 */
export function formatDocStatus(status?: string): { label: string; color: string } {
  switch (status) {
    case 'ready':
      return { label: 'Active', color: 'text-emerald-600' };
    case 'processing':
      return { label: '处理中', color: 'text-amber-600' };
    case 'pending':
      return { label: '等待中', color: 'text-gray-500' };
    case 'failed':
      return { label: '失败', color: 'text-red-600' };
    default:
      return { label: status || '未知', color: 'text-gray-400' };
  }
}

/** 知识库列表 - GET /api/v1/knowledge-bases */
export async function listKnowledgeBases(): Promise<KnowledgeBaseInfo[]> {
  const res = await requestWithAuth('/api/v1/knowledge-bases', { method: 'GET' });
  const data = await parseJsonResponse<
    KnowledgeBaseInfo[] | { knowledge_bases?: KnowledgeBaseInfo[]; items?: KnowledgeBaseInfo[] }
  >(res);
  if (Array.isArray(data)) return data;
  return data?.knowledge_bases ?? data?.items ?? [];
}

/** 创建知识库 - POST /api/v1/knowledge-bases */
export async function createKnowledgeBase(params: {
  name: string;
  code?: string;
  description?: string;
}): Promise<KnowledgeBaseInfo> {
  const res = await requestWithAuth('/api/v1/knowledge-bases', {
    method: 'POST',
    body: params,
  });
  return parseJsonResponse<KnowledgeBaseInfo>(res);
}

/** 获取知识库详情 - GET /api/v1/knowledge-bases/{id} */
export async function getKnowledgeBase(id: string): Promise<KnowledgeBaseInfo> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${id}`, { method: 'GET' });
  return parseJsonResponse<KnowledgeBaseInfo>(res);
}

/** 更新知识库 - PUT /api/v1/knowledge-bases/{id} */
export async function updateKnowledgeBase(
  id: string,
  params: { name?: string; description?: string }
): Promise<KnowledgeBaseInfo> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${id}`, {
    method: 'PUT',
    body: params,
  });
  return parseJsonResponse<KnowledgeBaseInfo>(res);
}

/** 删除知识库 - DELETE /api/v1/knowledge-bases/{id} */
export async function deleteKnowledgeBase(id: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${id}`, { method: 'DELETE' });
  await parseJsonResponse(res);
}

/** 获取知识库文档列表 - GET /api/v1/knowledge-bases/{id}/documents */
export async function listDocuments(knowledgeBaseId: string): Promise<DocumentInfo[]> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: 'GET',
  });
  const data = await parseJsonResponse<DocumentInfo[] | { documents?: DocumentInfo[]; items?: DocumentInfo[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.documents ?? data?.items ?? [];
}

/** 上传文档到知识库 - POST /api/v1/knowledge-bases/{id}/documents/upload */
export async function uploadDocument(knowledgeBaseId: string, file: File): Promise<DocumentInfo> {
  const form = new FormData();
  form.append('file', file);
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${knowledgeBaseId}/documents/upload`, {
    method: 'POST',
    body: form,
  });
  return parseJsonResponse<DocumentInfo>(res);
}

/** 通过 URL 添加文档 - POST /api/v1/knowledge-bases/{id}/documents/url */
export async function addDocumentByUrl(
  knowledgeBaseId: string,
  params: { url: string; name?: string }
): Promise<DocumentInfo> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${knowledgeBaseId}/documents/url`, {
    method: 'POST',
    body: params,
  });
  return parseJsonResponse<DocumentInfo>(res);
}

/** 通过文本创建文档 - POST /api/v1/knowledge-bases/{id}/documents/text */
export async function addDocumentByText(
  knowledgeBaseId: string,
  params: { name: string; content: string }
): Promise<DocumentInfo> {
  const res = await requestWithAuth(`/api/v1/knowledge-bases/${knowledgeBaseId}/documents/text`, {
    method: 'POST',
    body: params,
  });
  return parseJsonResponse<DocumentInfo>(res);
}

/** 删除文档 - DELETE /api/v1/documents/{id} */
export async function deleteDocument(documentId: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/documents/${documentId}`, { method: 'DELETE' });
  await parseJsonResponse(res);
}

/** 重新索引文档 - POST /api/v1/documents/{id}/reindex */
export async function reindexDocument(documentId: string): Promise<void> {
  const res = await requestWithAuth(`/api/v1/documents/${documentId}/reindex`, { method: 'POST' });
  await parseJsonResponse(res);
}

/** 格式化文件大小 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
