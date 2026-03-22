/**
 * useGroupChatMessaging
 *
 * 封装群聊消息的发送与接收逻辑：
 * - 乐观插入用户消息
 * - POST 发送；若服务端同步返回内容则立即刷新；否则启动 useEffect 轮询
 * - 轮询基于 useEffect（不在 handleSend 内 await），避免 stale-closure 和 placeholder 失效
 * - 收到回复后全量拉取服务器消息，确保 UI 与服务器一致
 * - 首轮对话自动生成标题
 */
import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ChatSession, Message, MessageAttachment } from '../types';
import type { PendingFile } from '../types/chat';
import {
  getGroupChatMessages,
  sendGroupChatMessage,
  updateGroupChat,
  type MessageItem,
} from '../services/groupChat';
import { generateSessionTitle } from '../services/chat';
import { resolvePendingAttachments } from '../services/files';

// ─── 工具函数（可单独引入复用） ─────────────────────────────────────────────

/** 将服务端 MessageItem[] 转为本地 Message[]（过滤 system 消息） */
export function parseServerMessages(messages: MessageItem[], sessionId: string): Message[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m, idx) => ({
      id: m.id || `${sessionId}-${idx}`,
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content || '',
      timestamp: m.created_at ? new Date(m.created_at as string).getTime() : Date.now(),
      attachments: m.attachments?.map((att) => ({
        type: (att.type === 'image' ? 'image' : 'file') as 'image' | 'file',
        token: att.token ?? '',
        mime_type: att.mime_type,
        name: att.name,
        size: att.size as number | undefined,
      })),
    }));
}

/** 从服务器拉取并转换消息 */
export async function fetchSessionMessages(sessionId: string): Promise<Message[]> {
  const raw = await getGroupChatMessages(sessionId);
  return parseServerMessages(raw, sessionId);
}

// ─── 常量 ──────────────────────────────────────────────────────────────────

const POLL_INITIAL_DELAY_MS = 1500;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 90; // ~3 分钟

// ─── Hook ──────────────────────────────────────────────────────────────────

interface UseGroupChatMessagingOptions {
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  useLinkyunChat: boolean;
}

export interface GroupChatMessaging {
  isLoading: boolean;
  sessionLoadError: string | null;
  setSessionLoadError: Dispatch<SetStateAction<string | null>>;
  /** 从服务器全量刷新某会话消息（可供外部调用） */
  refreshSessionMessages: (sessionId: string) => Promise<void>;
  /** 发送消息（处理附件上传、乐观更新、服务端通信、轮询） */
  sendMessage: (params: {
    sessionId: string;
    text: string;
    pendingFiles: PendingFile[];
    agentId?: string;
  }) => Promise<void>;
}

export function useGroupChatMessaging({
  sessions,
  setSessions,
  useLinkyunChat,
}: UseGroupChatMessagingOptions): GroupChatMessaging {
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [pollingSessionId, setPollingSessionId] = useState<string | null>(null);

  // 始终持有最新的 sessions，供轮询回调中读取（避免 stale closure）
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // ─── 全量刷新 ────────────────────────────────────────────────────────────

  const refreshSessionMessages = useCallback(
    async (sessionId: string) => {
      try {
        const messages = await fetchSessionMessages(sessionId);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, messages } : s))
        );
      } catch (e) {
        console.error('[refreshSessionMessages] 失败:', e);
      }
    },
    [setSessions]
  );

  // ─── 轮询 useEffect ───────────────────────────────────────────────────────
  // 设计参考 lumina-ai-chat-hub App.tsx groupPolling useEffect

  useEffect(() => {
    if (!pollingSessionId) return;
    const sessionId = pollingSessionId;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const serverMessages = await getGroupChatMessages(sessionId);
        if (cancelled) return;

        const nonSystem = serverMessages.filter((m) => m.role !== 'system');
        const last = nonSystem[nonSystem.length - 1];
        const hasAssistantReply =
          last?.role === 'assistant' &&
          typeof last.content === 'string' &&
          !!last.content.trim();

        if (hasAssistantReply) {
          const localMessages = parseServerMessages(serverMessages, sessionId);
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, messages: localMessages } : s))
          );
          setSessionLoadError(null);
          setPollingSessionId(null);
          setIsLoading(false);

          // 首轮对话自动生成标题
          const session = sessionsRef.current.find((s) => s.id === sessionId);
          if (session && localMessages.length >= 2 && localMessages.length <= 4) {
            const msgList = localMessages.map((m) => ({ role: m.role, content: m.content }));
            generateSessionTitle(msgList, session.agentId)
              .then((title) => {
                setSessions((prev) =>
                  prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
                );
                updateGroupChat(sessionId, { title }).catch(() => {});
              })
              .catch(() => {});
          }
          return;
        }

        attempts++;
        if (attempts >= POLL_MAX_ATTEMPTS) {
          if (!cancelled) {
            setSessionLoadError(sessionId);
            setPollingSessionId(null);
            setIsLoading(false);
          }
          return;
        }

        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        console.error('[poll] 失败:', e);
        if (!cancelled) {
          setSessionLoadError(sessionId);
          setPollingSessionId(null);
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(poll, POLL_INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollingSessionId, setSessions]);

  // ─── sendMessage ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async ({
      sessionId,
      text,
      pendingFiles,
      agentId,
    }: {
      sessionId: string;
      text: string;
      pendingFiles: PendingFile[];
      agentId?: string;
    }) => {
      if (!useLinkyunChat) return;

      const filesToSend = pendingFiles.filter((p) => !p.error);
      setIsLoading(true);
      setSessionLoadError(null);

      // 1. 上传附件
      let resolved: Awaited<ReturnType<typeof resolvePendingAttachments>> = [];
      if (filesToSend.length > 0) {
        try {
          resolved = await resolvePendingAttachments(filesToSend);
        } catch (e) {
          console.error('[sendMessage] 上传附件失败:', e);
          setIsLoading(false);
          return;
        }
      }

      const hasImage = resolved.some((a) => a.type === 'image');
      const content = text || (hasImage ? '请分析这个图片' : '(附带文档)');
      const msgAttachments: MessageAttachment[] = resolved.map((a) => ({
        type: a.type as 'image' | 'file',
        token: a.token,
        mime_type: a.mime_type,
        name: a.name,
        size: a.size,
        previewUrl: a.preview_url ?? a.download_url,
      }));

      // 2. 乐观插入用户消息
      const tempMsgId = `user-${Date.now()}`;
      const userMessage: Message = {
        id: tempMsgId,
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments: msgAttachments.length ? msgAttachments : undefined,
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, messages: [...s.messages, userMessage] } : s
        )
      );

      // 3. POST 发送
      const attachForApi = resolved.length
        ? resolved.map((a) => ({ type: a.type, token: a.token }))
        : undefined;

      try {
        const syncContent = await sendGroupChatMessage(sessionId, {
          content,
          attachments: attachForApi,
        });

        if (syncContent) {
          // 同步 Agent：全量刷新获取真实消息 ID / 时间戳
          await refreshSessionMessages(sessionId);
          setIsLoading(false);

          // 自动生成标题
          const updated = sessionsRef.current.find((s) => s.id === sessionId);
          if (updated && updated.messages.length >= 2 && updated.messages.length <= 4) {
            const msgList = updated.messages.map((m) => ({ role: m.role, content: m.content }));
            generateSessionTitle(msgList, agentId ?? updated.agentId)
              .then((title) => {
                setSessions((prev) =>
                  prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
                );
                updateGroupChat(sessionId, { title }).catch(() => {});
              })
              .catch(() => {});
          }
        } else {
          // 异步 Agent（Edge）：启动 useEffect 轮询
          setPollingSessionId(sessionId);
        }
      } catch (e) {
        console.error('[sendMessage] POST 失败:', e);
        // 回滚乐观消息
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== tempMsgId) }
              : s
          )
        );
        setSessionLoadError(sessionId);
        setIsLoading(false);
      }
    },
    [useLinkyunChat, setSessions, refreshSessionMessages]
  );

  return {
    isLoading,
    sessionLoadError,
    setSessionLoadError,
    refreshSessionMessages,
    sendMessage,
  };
}
