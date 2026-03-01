import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, RefreshCw, TrendingUp, Pencil, Sparkles, X, Check, Compass, Wrench, Bot, ChevronRight, Loader2 } from 'lucide-react';
import { ChatSession, Message, MessageAttachment } from '../types';
import {
  getSystemAgentId,
  listGroupChats,
  createGroupChat,
  getGroupChatMessages,
  sendGroupChatMessage,
  deleteGroupChat,
  updateGroupChat,
  pollForAssistantResponse,
  type GroupChatInfo,
} from '../services/groupChat';
import { generateSessionTitle, type MessageItem } from '../services/chat';
import { ChatSidebar, ChatMessageBubble, ChatEmptyState, ChatInput, type MenuItem } from './chat';
import { useFileUpload } from '../hooks/useFileUpload';
import { resolvePendingAttachments } from '../services/files';
import { clearAuth, getWorkspaceId, setWorkspace } from '../lib/authStorage';
import {
  listAgents,
  getAgentAvatarUrl,
  type AgentInfo,
} from '../services/agents';
import { getAgentByCode } from '../services/chat';
import {
  SYSTEM_AGENT_CODE,
  SYSTEM_ASSISTANT_AGENT_CODE,
  SYSTEM_SERVICE_AGENT_CODE,
  API_BASE_URL,
  WORKSPACE_CODE,
} from '../config/api';
import { getUserWorkspaces } from '../services/workspace';
import { texts, tw } from '../themes';

const useLinkyunChat = !!SYSTEM_AGENT_CODE?.trim();

/** 需要排除的系统 Agent code 集合 */
const SYSTEM_AGENT_CODES = new Set(
  [SYSTEM_AGENT_CODE, SYSTEM_ASSISTANT_AGENT_CODE, SYSTEM_SERVICE_AGENT_CODE]
    .filter((c): c is string => !!c?.trim())
    .map((c) => c.trim().toLowerCase())
);

/** 过滤掉系统预设 Agent，只保留律师创建的数字人 */
function filterSystemAgents(agents: AgentInfo[]): AgentInfo[] {
  if (SYSTEM_AGENT_CODES.size === 0) return agents;
  return agents.filter((a) => {
    const code = a.code?.trim().toLowerCase();
    return !code || !SYSTEM_AGENT_CODES.has(code);
  });
}

export default function IndividualPortal() {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  
  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [navigate]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(urlSessionId || null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [lawyerAgents, setLawyerAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [startingChatWithAgent, setStartingChatWithAgent] = useState<string | null>(null);
  const agentIdRef = useRef<string | null>(null);
  const assistantAgentIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { pendingFiles, addFiles, removePendingFile, clearPendingFiles } = useFileUpload();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const loadGroupChatHistory = React.useCallback(async () => {
    if (!useLinkyunChat) return;
    try {
      const systemAgentId = agentIdRef.current ?? (await getSystemAgentId());
      agentIdRef.current = systemAgentId;
      
      // 确保 workspace 信息已存储（兼容旧登录用户）
      let workspaceId = getWorkspaceId();
      if (!workspaceId && WORKSPACE_CODE?.trim()) {
        try {
          const workspaces = await getUserWorkspaces();
          const targetCode = WORKSPACE_CODE.trim();
          const found = workspaces.find(
            (item) => (item.workspace?.code ?? (item as { code?: string }).code) === targetCode
          );
          if (found?.workspace?.id) {
            const ws = found.workspace;
            setWorkspace({ id: String(ws.id), code: ws.code, name: ws.name });
            workspaceId = String(ws.id);
          } else {
            const itemAny = found as Record<string, unknown> | undefined;
            const directId = itemAny?.id ?? itemAny?.workspace_id;
            const directCode = itemAny?.code ?? itemAny?.workspace_code;
            if (directId && directCode) {
              setWorkspace({ id: String(directId), code: String(directCode), name: itemAny?.name as string });
              workspaceId = String(directId);
            }
          }
        } catch (e) {
          console.error('获取 workspace 信息失败', e);
        }
      }
      
      // 加载当前 workspace 下的群聊（只返回 Agent 都属于该 workspace 的群聊）
      const groupList = await listGroupChats({ 
        limit: 50,
        ...(workspaceId && { workspace_id: workspaceId }),
      });
      
      // 获取 SYSTEM_ASSISTANT_AGENT_CODE 对应的 Agent ID（用于过滤）
      let assistantAgentId = assistantAgentIdRef.current;
      if (!assistantAgentId && SYSTEM_ASSISTANT_AGENT_CODE?.trim()) {
        try {
          const assistantAgent = await getAgentByCode(SYSTEM_ASSISTANT_AGENT_CODE);
          assistantAgentId = String(assistantAgent.id);
          assistantAgentIdRef.current = assistantAgentId;
        } catch (e) {
          console.error('获取 assistant agent 失败', e);
        }
      }
      
      // 只保留有且只有一个 Agent 的群聊（排除多 Agent 群聊）
      // 同时排除与 SYSTEM_ASSISTANT_AGENT_CODE 对应 Agent 的聊天
      const singleAgentChats = groupList.filter((g) => {
        let agentId: string | undefined;
        if (Array.isArray(g.participants)) {
          const agentParticipants = g.participants.filter(
            (p) => p.type === 'agent' || p.agent_id != null
          );
          if (agentParticipants.length !== 1) return false;
          agentId = String(agentParticipants[0].agent_id ?? agentParticipants[0].id ?? '');
        } else if (Array.isArray(g.agent_ids)) {
          if (g.agent_ids.length !== 1) return false;
          agentId = String(g.agent_ids[0]);
        } else {
          return false;
        }
        // 排除 SYSTEM_ASSISTANT_AGENT_CODE 对应的 Agent 聊天
        if (assistantAgentId && agentId === assistantAgentId) {
          return false;
        }
        return true;
      });
      const chatSessions: ChatSession[] = singleAgentChats.map((g: GroupChatInfo) => {
        // 提取群聊中的 Agent 信息
        let agentId: string | undefined;
        let agentName: string | undefined;
        if (Array.isArray(g.participants)) {
          const agentParticipant = g.participants.find(
            (p) => p.type === 'agent' || p.agent_id != null
          );
          if (agentParticipant) {
            agentId = String(agentParticipant.agent_id ?? agentParticipant.id ?? '');
            agentName = (agentParticipant as { agent_name?: string; name?: string }).agent_name
              ?? (agentParticipant as { name?: string }).name;
          }
        } else if (Array.isArray(g.agent_ids) && g.agent_ids.length > 0) {
          agentId = String(g.agent_ids[0]);
        }
        // 判断是否为系统 Agent 群聊
        const isSystemAgent = agentId === String(systemAgentId);
        return {
          id: String(g.id),
          title: (g.title ?? (g as { topic?: string }).topic ?? '新对话') as string,
          messages: [],
          createdAt: g.created_at ? new Date(g.created_at as string).getTime() : Date.now(),
          agentId: isSystemAgent ? undefined : agentId,
          agentName: isSystemAgent ? undefined : agentName,
        };
      });
      chatSessions.sort((a, b) => b.createdAt - a.createdAt);
      setSessions((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        return chatSessions.map((s) => ({
          ...s,
          messages: byId.get(s.id)?.messages ?? s.messages,
          title: byId.get(s.id)?.title ?? s.title,
          agentId: byId.get(s.id)?.agentId ?? s.agentId,
          agentName: byId.get(s.id)?.agentName ?? s.agentName,
        }));
      });
    } catch (e) {
      console.error('加载历史群聊失败', e);
    }
  }, []);

  useEffect(() => {
    if (!useLinkyunChat) return;
    loadGroupChatHistory();
  }, [loadGroupChatHistory]);

  useEffect(() => {
    if (useLinkyunChat && isSidebarOpen) {
      loadGroupChatHistory();
    }
  }, [useLinkyunChat, isSidebarOpen, loadGroupChatHistory]);

  // 打开发现弹窗时加载律师数字人列表
  useEffect(() => {
    if (!isDiscoverOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingAgents(true);
      try {
        const list = await listAgents({ status: 'active', limit: 100 });
        if (!cancelled) {
          setLawyerAgents(filterSystemAgents(list));
        }
      } catch (e) {
        console.error('加载律师数字人失败', e);
        if (!cancelled) setLawyerAgents([]);
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDiscoverOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  useEffect(() => {
    if (urlSessionId && urlSessionId !== activeSessionId) {
      setActiveSessionId(urlSessionId);
    }
  }, [urlSessionId, activeSessionId]);

  useEffect(() => {
    if (!urlSessionId || !useLinkyunChat) return;
    const session = sessions.find((s) => s.id === urlSessionId);
    if (session && session.messages.length === 0) {
      (async () => {
        try {
          const messages = await getGroupChatMessages(urlSessionId);
          const localMessages: Message[] = messages
            .filter((m) => m.role !== 'system')
            .map((m, idx) => ({
              id: m.id || `${urlSessionId}-${idx}`,
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
          setSessions((prev) =>
            prev.map((s) => (s.id === urlSessionId ? { ...s, messages: localMessages } : s))
          );
        } catch (e) {
          console.error('加载消息失败', e);
        }
      })();
    }
  }, [urlSessionId, sessions]);

  useEffect(() => {
    if (activeSessionId) {
      const currentPath = `/individual/chat/${activeSessionId}`;
      if (window.location.pathname !== currentPath) {
        navigate(currentPath, { replace: true });
      }
    } else if (window.location.pathname !== '/individual') {
      navigate('/individual', { replace: true });
    }
  }, [activeSessionId, navigate]);

  const createNewSession = async () => {
    if (creatingSession || !useLinkyunChat) return;
    setCreatingSession(true);
    try {
      const agentId = agentIdRef.current ?? await getSystemAgentId();
      agentIdRef.current = agentId;
      const group = await createGroupChat(agentId);
      const newSession: ChatSession = {
        id: String(group.id),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      navigate(`/individual/chat/${newSession.id}`);
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingSession(false);
    }
  };

  // 选择律师数字人后创建新对话
  const startChatWithLawyerAgent = async (agent: AgentInfo) => {
    if (startingChatWithAgent) return;
    setStartingChatWithAgent(agent.id);
    try {
      const group = await createGroupChat(agent.id);
      const newSession: ChatSession = {
        id: String(group.id),
        title: agent.name || '律师咨询',
        messages: [],
        createdAt: Date.now(),
        agentId: agent.id,
        agentName: agent.name || '律师助手',
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      navigate(`/individual/chat/${newSession.id}`);
      setIsDiscoverOpen(false);
    } catch (e) {
      console.error('创建律师对话失败', e);
    } finally {
      setStartingChatWithAgent(null);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      const nextSession = newSessions[0];
      setActiveSessionId(nextSession?.id || null);
      if (nextSession) {
        navigate(`/individual/chat/${nextSession.id}`);
      } else {
        navigate('/individual');
      }
    }

    if (useLinkyunChat) {
      try {
        await deleteGroupChat(id);
      } catch (e) {
        console.error('删除群聊失败', e);
      }
    }
  };

  const refreshSessionMessages = React.useCallback(async (sessionId: string) => {
    setSessionLoadError(null);
    try {
      const messages = await getGroupChatMessages(sessionId);
      const localMessages: Message[] = messages
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
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, messages: localMessages } : s))
      );
    } catch (e) {
      console.error('刷新消息失败', e);
    }
  }, []);

  const selectSession = (sessionId: string) => {
    setIsSidebarOpen(false);
    navigate(`/individual/chat/${sessionId}`);
  };

  const handleRegenerateTitle = async () => {
    if (!activeSession || activeSession.messages.length === 0 || isRegeneratingTitle) return;
    setIsRegeneratingTitle(true);
    try {
      const msgList = activeSession.messages.map((m) => ({ role: m.role, content: m.content }));
      const newTitle = await generateSessionTitle(msgList);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title: newTitle } : s))
      );
      if (useLinkyunChat && activeSessionId) {
        await updateGroupChat(activeSessionId, { title: newTitle }).catch(() => {});
      }
    } catch (e) {
      console.error('重新生成标题失败', e);
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  const openEditTitleModal = () => {
    if (!activeSession) return;
    setEditTitleValue(activeSession.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const newTitle = editTitleValue.trim();
    if (!newTitle || !activeSessionId) {
      setIsEditingTitle(false);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, title: newTitle } : s))
    );
    setIsEditingTitle(false);
    if (useLinkyunChat) {
      await updateGroupChat(activeSessionId, { title: newTitle }).catch(() => {});
    }
  };

  const handleSend = async () => {
    if (!useLinkyunChat) return;
    const text = input.trim();
    const filesToSend = pendingFiles.filter((p) => !p.error);
    if ((!text && filesToSend.length === 0) || isLoading) return;

    setInput('');
    setIsLoading(true);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      setCreatingSession(true);
      try {
        const agentId = agentIdRef.current ?? await getSystemAgentId();
        agentIdRef.current = agentId;
        const group = await createGroupChat(agentId);
        const newSession: ChatSession = {
          id: String(group.id),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        currentSessionId = newSession.id;
      } catch (e) {
        console.error(e);
        setCreatingSession(false);
        setIsLoading(false);
        return;
      } finally {
        setCreatingSession(false);
      }
    }

    // §5.2 步骤 1：上传文件获取 token（在构造消息之前完成）
    let resolved: Awaited<ReturnType<typeof resolvePendingAttachments>> = [];
    if (filesToSend.length > 0) {
      try {
        resolved = await resolvePendingAttachments(filesToSend);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
        return;
      }
    }

    // §5.2 步骤 2：用已上传的 token 构造用户消息（乐观更新）
    const msgAttachments: MessageAttachment[] = resolved.map((a) => ({
      type: a.type,
      token: a.token,
      mime_type: a.mime_type,
      name: a.name,
      size: a.size,
      previewUrl: a.preview_url ?? a.download_url,
    }));

    const hasImage = resolved.some((a) => a.type === 'image');
    const defaultContent = hasImage ? '请分析这个图片' : '(附带文档)';

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || defaultContent,
      timestamp: Date.now(),
      attachments: msgAttachments.length ? msgAttachments : undefined,
    };

    setSessions((prev) => {
      const found = prev.find((s) => s.id === currentSessionId);
      if (found) {
        return prev.map((s) =>
          s.id === currentSessionId ? { ...s, messages: [...s.messages, userMessage] } : s
        );
      }
      return [
        { id: currentSessionId!, title: '新对话', messages: [userMessage], createdAt: Date.now() },
        ...prev,
      ];
    });
    clearPendingFiles();

    // §5.2 步骤 3：发 API 只传 { type, token }
    const attachForApi = resolved.length
      ? resolved.map((a) => ({ type: a.type, token: a.token }))
      : undefined;

    const appendAssistantMessage = (content: string) => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSessionId) return s;
          const newMessages = [...s.messages, assistantMessage];
          if (newMessages.length === 3 || newMessages.length === 4) {
            const msgList = newMessages.map((m) => ({ role: m.role, content: m.content }));
            generateSessionTitle(msgList)
              .then((title) => {
                setSessions((latest) =>
                  latest.map((ls) => (ls.id === currentSessionId ? { ...ls, title } : ls))
                );
                if (useLinkyunChat && currentSessionId) {
                  updateGroupChat(currentSessionId, { title }).catch(() => {});
                }
              })
              .catch(() => {});
          }
          return { ...s, messages: newMessages };
        })
      );
    };

    const msgCountBefore = sessions.find((s) => s.id === currentSessionId)?.messages?.length ?? 0;
    const minCount = msgCountBefore + 1;

    const extractFromResponse = (res: MessageItem | { messages?: MessageItem[] }): string | null => {
      const m = res as MessageItem;
      if (m?.role === 'assistant' && typeof m?.content === 'string' && m.content.trim()) return m.content.trim();
      const arr = (res as { messages?: MessageItem[] }).messages;
      if (Array.isArray(arr) && arr.length > minCount) {
        const last = arr[arr.length - 1];
        if (last?.role === 'assistant' && typeof last?.content === 'string' && (last.content as string).trim()) {
          return (last.content as string).trim();
        }
      }
      return null;
    };

    try {
      const res = await sendGroupChatMessage(currentSessionId!, {
        content: text || defaultContent,
        attachments: attachForApi,
        stream: false,
      });
      let content = extractFromResponse(res);
      if (!content) {
        content = await pollForAssistantResponse(currentSessionId!, 30000, minCount);
      }
      if (content) {
        appendAssistantMessage(content);
        setSessionLoadError(null);
      } else {
        setSessionLoadError(currentSessionId!);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = texts.individual.suggestions;

  if (!useLinkyunChat) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-8 bg-slate-50">
        <div className={`w-16 h-16 ${tw.iconBg} rounded-2xl flex items-center justify-center ${tw.iconColor} mb-4`}>
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">系统未配置</h3>
        <p className="text-sm text-slate-500 mb-6">
          请在环境变量中设置 VITE_SYSTEM_AGENT_CODE
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          {texts.login.goLogin}
        </button>
      </div>
    );
  }

  const menuItems: MenuItem[] = [
    {
      id: 'discover',
      label: texts.individual.discover,
      icon: Compass,
      onClick: () => setIsDiscoverOpen(true),
    },
    {
      id: 'tools',
      label: texts.individual.tools,
      icon: Wrench,
      onClick: () => {},
      disabled: true,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <ChatSidebar
        variant="individual"
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onCreateSession={createNewSession}
        onDeleteSession={deleteSession}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        creatingSession={creatingSession}
        menuItems={menuItems}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 border-b border-slate-100 flex items-center px-4 gap-2 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">
              {activeSession?.title || texts.individual.headerTitle}
            </h1>
            {activeSession && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleRegenerateTitle}
                  disabled={isRegeneratingTitle}
                  className={`p-1.5 text-slate-400 ${tw.hoverPrimary} rounded-lg transition-colors disabled:opacity-50`}
                  title="重新生成标题"
                >
                  <Sparkles className={`w-4 h-4 ${isRegeneratingTitle ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={openEditTitleModal}
                  className={`p-1.5 text-slate-400 ${tw.hoverPrimary} rounded-lg transition-colors`}
                  title="编辑标题"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!activeSession || activeSession.messages.length === 0 ? (
            <ChatEmptyState
              variant="individual"
              title={texts.individual.emptyTitle}
              description={texts.individual.emptyDescription}
              suggestions={suggestions}
              onSuggestionClick={setInput}
            />
          ) : (
            activeSession.messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} variant="individual" />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          {sessionLoadError === activeSessionId && activeSession && (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-slate-500 text-sm">{texts.individual.systemBusy}</p>
              <button
                onClick={() => refreshSessionMessages(activeSessionId!)}
                className={`inline-flex items-center gap-2 px-4 py-2 ${tw.iconBg} ${tw.iconColor} rounded-xl text-sm font-medium ${tw.hoverAccent} transition-colors`}
              >
                <RefreshCw className="w-4 h-4" />
                {texts.individual.refresh}
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          variant="individual"
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
          placeholder={texts.individual.inputPlaceholder}
          pendingFiles={pendingFiles}
          onAddFiles={addFiles}
          onRemoveFile={removePendingFile}
          hint={texts.individual.inputHint}
        />
      </main>

      <AnimatePresence>
        {isEditingTitle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setIsEditingTitle(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{texts.individual.editTitle}</h2>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:border-transparent text-slate-900`}
                placeholder="输入新标题"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {texts.individual.cancel}
                </button>
                <button
                  onClick={handleSaveTitle}
                  className={`px-4 py-2 ${tw.btnPrimary} rounded-xl transition-colors inline-flex items-center gap-2`}
                >
                  <Check className="w-4 h-4" />
                  {texts.individual.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {isDiscoverOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setIsDiscoverOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${tw.iconBg} rounded-xl flex items-center justify-center`}>
                    <Compass className={`w-5 h-5 ${tw.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{texts.individual.discoverTitle}</h2>
                    <p className="text-sm text-slate-500">{texts.individual.discoverDescription}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDiscoverOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                {loadingAgents ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className={`w-8 h-8 animate-spin ${tw.spinnerColor}`} />
                    <p className="mt-3 text-sm">加载中...</p>
                  </div>
                ) : lawyerAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Bot className="w-12 h-12 mb-3" />
                    <p className="text-sm">{texts.individual.noAdvisors}</p>
                    <p className="text-xs mt-1">{texts.individual.noAdvisorsHint}</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {lawyerAgents.map((agent) => {
                      const avatarUrl = getAgentAvatarUrl(agent, API_BASE_URL || '');
                      const isStarting = startingChatWithAgent === agent.id;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => startChatWithLawyerAgent(agent)}
                          disabled={!!startingChatWithAgent}
                          className={`flex items-center gap-4 p-4 bg-slate-50 ${tw.hoverAccent} rounded-xl transition-colors text-left group disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                            ) : (
                              <Bot className={`w-6 h-6 ${tw.spinnerColor}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium text-slate-900 group-hover:${tw.iconColor.replace('text-', '')} transition-colors`}>
                              {agent.name || texts.individual.advisorDefault}
                            </h3>
                            <p className="text-sm text-slate-500 truncate">{agent.description || texts.individual.advisorDescDefault}</p>
                          </div>
                          {isStarting ? (
                            <Loader2 className={`w-5 h-5 ${tw.spinnerColor} animate-spin`} />
                          ) : (
                            <ChevronRight className={`w-5 h-5 text-slate-300 group-hover:${tw.iconColor.replace('text-', '')} transition-colors`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!loadingAgents && lawyerAgents.length > 0 && (
                  <p className="text-center text-sm text-slate-400 mt-6">{texts.individual.clickToChat}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
