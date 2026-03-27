export type Role = 'individual' | 'lawyer' | 'judiciary' | null;

export interface MessageAttachment {
  type: 'image' | 'file';
  token: string;
  mime_type?: string;
  name?: string;
  size?: number;
  /** 仅前端展示用：图片预览 URL（object URL 或 token 下载地址） */
  previewUrl?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: MessageAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  /** 该会话对应的 Agent ID（律师数字人群聊时有值） */
  agentId?: string;
  /** 该会话对应的 Agent 名称（用于在侧边栏显示） */
  agentName?: string;
  /** 是否与 Agent 创作者共享本会话（对应 API shared_with_creator；未拉取到时默认视为开启） */
  sharedWithCreator?: boolean;
  /** 创作者是否已确认/审阅本会话（对应 API verified） */
  creatorReviewed?: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
}
