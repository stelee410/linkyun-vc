/** 待上传文件（前端状态），type 与后端一致："image" | "file" */
export type PendingFile = {
  file: File;
  type: 'image' | 'file';
  token?: string;
  error?: string;
  previewUrl?: string;
};
