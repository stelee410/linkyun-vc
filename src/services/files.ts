/**
 * Linkyun 文件上传 - 图片、文档
 * 文档: docs/API使用指南.md §4.10
 */
import { requestWithAuth, parseJsonResponse } from './api';
import { getApiUrl } from '../config/api';

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]);

export function isImageFile(file: File): boolean {
  return IMAGE_MIME.has(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

export function isDocumentFile(file: File): boolean {
  return (
    DOC_MIME.has(file.type) ||
    /\.(pdf|docx?|txt|md)$/i.test(file.name)
  );
}

/** 确保 URL 是完整地址：相对路径拼接 VITE_API_BASE_URL，绝对路径直接返回 */
function toFullUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return getApiUrl(url.startsWith('/') ? url : `/${url}`);
}

/** 上传后返回的 token 结构（按实际 API 调整） */
export interface UploadResult {
  token: string;
  [key: string]: unknown;
}

/** 图片上传 - POST /api/v1/files/upload，multipart 字段 file */
export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await requestWithAuth('/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });
  const data = await parseJsonResponse<UploadResult | { token?: string }>(res);
  const token = (data as UploadResult).token ?? (data as { token?: string }).token;
  if (!token) throw new Error('上传未返回 token');
  return { ...(typeof data === 'object' && data !== null ? data : {}), token };
}

/** 文档上传 - POST /api/v1/files/upload-document */
export async function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await requestWithAuth('/api/v1/files/upload-document', {
    method: 'POST',
    body: form,
  });
  const data = await parseJsonResponse<UploadResult | { token?: string }>(res);
  const token = (data as UploadResult).token ?? (data as { token?: string }).token;
  if (!token) throw new Error('上传未返回 token');
  return { ...(typeof data === 'object' && data !== null ? data : {}), token };
}

export interface UploadFileResult {
  token: string;
  type: 'image' | 'file';
  download_url?: string;
  preview_url?: string;
}

/** 根据文件类型选择上传接口，返回 token 及完整 URL */
export async function uploadFile(file: File): Promise<UploadFileResult> {
  if (isImageFile(file)) {
    const r = await uploadImage(file);
    return {
      token: r.token,
      type: 'image',
      download_url: toFullUrl((r as Record<string, unknown>).download_url as string | undefined),
      preview_url: toFullUrl((r as Record<string, unknown>).preview_url as string | undefined),
    };
  }
  if (isDocumentFile(file)) {
    const r = await uploadDocument(file);
    return {
      token: r.token,
      type: 'file',
      download_url: toFullUrl((r as Record<string, unknown>).download_url as string | undefined),
    };
  }
  throw new Error('不支持的文件类型，请上传图片（jpg/png/gif/webp）或文档（pdf/doc/docx/txt/md）');
}

/** 已解析的附件（上传后含 token），文档: docs/聊天窗口怎么上传图片和文件.md §六 */
export interface ResolvedAttachment {
  type: 'image' | 'file';
  token: string;
  download_url?: string;
  preview_url?: string;
  mime_type?: string;
  name?: string;
  size?: number;
}

/**
 * 发送前解析待上传附件：将含 file 的 PendingFile 上传并转为带 token 的 ResolvedAttachment
 * 文档: docs/聊天窗口怎么上传图片和文件.md §4.2
 */
export async function resolvePendingAttachments(
  pending: Array<{ file: File; type: 'image' | 'file'; token?: string; error?: string }>
): Promise<ResolvedAttachment[]> {
  const valid = pending.filter((p) => !p.error);
  const results: ResolvedAttachment[] = [];
  for (const p of valid) {
    if (p.token) {
      results.push({ type: p.type, token: p.token, mime_type: p.file.type, name: p.file.name, size: p.file.size });
      continue;
    }
    try {
      const uploaded = await uploadFile(p.file);
      const tokenDownloadUrl = `${getApiUrl(`/api/v1/files/${uploaded.token}/download`)}`;
      results.push({
        type: uploaded.type,
        token: uploaded.token,
        download_url: uploaded.download_url ?? tokenDownloadUrl,
        preview_url: uploaded.type === 'image'
          ? (uploaded.preview_url ?? `${tokenDownloadUrl}?preview=1`)
          : undefined,
        mime_type: p.file.type,
        name: p.file.name,
        size: p.file.size,
      });
    } catch (e) {
      throw new Error(`上传「${p.file.name}」失败：${(e as Error).message}`);
    }
  }
  return results;
}
