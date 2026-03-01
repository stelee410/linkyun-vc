/**
 * 聊天窗口文件上传 - 按 docs/聊天窗口怎么上传图片和文件.md 实现
 * 策略：选择文件后不立即上传，保存为 PendingFile；点击发送时再统一上传获取 token
 */
import { useState, useCallback } from 'react';
import { isImageFile, isDocumentFile } from '../services/files';
import type { PendingFile } from '../types/chat';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';
const DOC_ACCEPT = 'application/pdf,.pdf,.doc,.docx,text/plain,.txt,.md';

export { IMAGE_ACCEPT, DOC_ACCEPT };

function validateFile(file: File, type: 'image' | 'file'): string | null {
  if (file.size > MAX_FILE_SIZE) return '文件大小不能超过 20MB';
  if (type === 'image') {
    if (!file.type.startsWith('image/') && !isImageFile(file)) return '请上传图片（jpg/png/gif/webp）';
  } else {
    if (!isDocumentFile(file)) return '请上传文档（pdf/doc/docx/txt/md）';
  }
  return null;
}

export function useFileUpload() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const addFiles = useCallback((files: FileList | null, type: 'image' | 'document') => {
    if (!files?.length) return;
    const list: PendingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = type === 'image' || isImageFile(file);
      const isDoc = type === 'document' || isDocumentFile(file);
      if (!isImage && !isDoc) continue;
      const fileType: 'image' | 'file' = isImage ? 'image' : 'file';
      const err = validateFile(file, fileType);
      const pending: PendingFile = {
        file,
        type: fileType,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        error: err ?? undefined,
      };
      list.push(pending);
    }
    setPendingFiles(prev => [...prev, ...list]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => {
      const p = prev[index];
      if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles(prev => {
      prev.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, []);

  return {
    pendingFiles,
    addFiles,
    removePendingFile,
    clearPendingFiles,
    setPendingFiles,
  };
}
