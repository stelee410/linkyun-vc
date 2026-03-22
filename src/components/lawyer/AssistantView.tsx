import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Menu, RefreshCw, Pencil, Sparkles, X, Check } from 'lucide-react';
import { SYSTEM_ASSISTANT_AGENT_CODE } from '../../config/api';
import {
  getAgentByCode,
  generateSessionTitle,
} from '../../services/chat';
import {
  listGroupChats,
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
  filterSingleAgentGroupChats,
  type GroupChatInfo,
} from '../../services/groupChat';
import type { ChatSession } from '../../types';
import { ChatSidebar, ChatMessageBubble, ChatEmptyState, ChatInput } from '../chat';
import { useFileUpload } from '../../hooks/useFileUpload';
import { texts, tw } from '../../themes';
import { useGroupChatMessaging } from '../../hooks/useGroupChatMessaging';

export default function AssistantView() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const agentIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const useLinkyunChat = !!SYSTEM_ASSISTANT_AGENT_CODE?.trim();
  const messaging = useGroupChatMessaging({ sessions, setSessions, useLinkyunChat });

  const { pendingFiles, addFiles, removePendingFile, clearPendingFiles } = useFileUpload();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const loadGroupChatHistory = React.useCallback(async () => {
    if (!useLinkyunChat) return;
    try {
      const agent = await getAgentByCode(SYSTEM_ASSISTANT_AGENT_CODE!);
      agentIdRef.current = agent.id;
      const groupList = await listGroupChats({ agent_id: agent.id, limit: 50 });
      // 严格过滤：只保留 participants 中有且只有一个 Agent 且与系统 Agent ID 一致的群聊
      const filteredList = filterSingleAgentGroupChats(groupList, agent.id);
      const chatSessions: ChatSession[] = filteredList.map((g: GroupChatInfo) => ({
        id: String(g.id),
        title: (g.title ?? (g as { topic?: string }).topic ?? '新对话') as string,
        messages: [],
        createdAt: g.created_at ? new Date(g.created_at as string).getTime() : Date.now(),
      }));
      chatSessions.sort((a, b) => b.createdAt - a.createdAt);
      setSessions((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        return chatSessions.map((s) => ({
          ...s,
          messages: byId.get(s.id)?.messages ?? s.messages,
          title: byId.get(s.id)?.title ?? s.title,
        }));
      });
    } catch (e) {
      console.error('加载历史群聊失败', e);
    }
  }, [useLinkyunChat]);

  useEffect(() => {
    if (!useLinkyunChat) return;
    loadGroupChatHistory();
  }, [loadGroupChatHistory, useLinkyunChat]);

  useEffect(() => {
    if (useLinkyunChat && isSidebarOpen) {
      loadGroupChatHistory();
    }
  }, [useLinkyunChat, isSidebarOpen, loadGroupChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  useEffect(() => {
    if (activeSessionId) {
      chatInputRef.current?.focus();
    }
  }, [activeSessionId]);

  const createNewSession = async () => {
    if (creatingSession || !useLinkyunChat) return;
    setCreatingSession(true);
    try {
      const agentId = agentIdRef.current ?? (await getAgentByCode(SYSTEM_ASSISTANT_AGENT_CODE!)).id;
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
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingSession(false);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter((s) => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0]?.id || null);
    }
    if (useLinkyunChat) {
      try {
        await deleteGroupChat(id);
      } catch (e) {
        console.error('删除群聊失败', e);
      }
    }
  };

  const refreshSessionMessages = messaging.refreshSessionMessages;

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    messaging.setSessionLoadError(null);
    setIsSidebarOpen(false);

    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.messages.length === 0 && useLinkyunChat) {
      await messaging.refreshSessionMessages(sessionId);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!activeSession || activeSession.messages.length === 0 || isRegeneratingTitle) return;
    setIsRegeneratingTitle(true);
    try {
      const msgList = activeSession.messages.map((m) => ({ role: m.role, content: m.content }));
      const newTitle = await generateSessionTitle(msgList, activeSession.agentId ?? agentIdRef.current ?? undefined);
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
    const text = input.trim();
    const filesToSend = pendingFiles.filter((p) => !p.error);
    if ((!text && filesToSend.length === 0) || messaging.isLoading || !useLinkyunChat) return;

    setInput('');
    clearPendingFiles();

    let sessionId = activeSessionId;

    // 新用户首次发送：先自动创建会话
    if (!sessionId) {
      setCreatingSession(true);
      try {
        const agentId = agentIdRef.current ?? (await getAgentByCode(SYSTEM_ASSISTANT_AGENT_CODE!)).id;
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
        sessionId = newSession.id;
      } catch (e) {
        console.error('创建对话失败:', e);
        setCreatingSession(false);
        return;
      } finally {
        setCreatingSession(false);
      }
    }

    await messaging.sendMessage({
      sessionId,
      text,
      pendingFiles: filesToSend,
      agentId: agentIdRef.current ?? undefined,
    });
  };

  if (!useLinkyunChat) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Bot className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">{texts.lawyer.assistant.notConfigured}</h3>
        <p className="text-sm text-slate-500">
          {texts.lawyer.assistant.notConfiguredHint}
        </p>
      </div>
    );
  }

  const suggestions = texts.lawyer.assistant.suggestions;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      <ChatSidebar
        variant="lawyer"
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onCreateSession={createNewSession}
        onDeleteSession={deleteSession}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        creatingSession={creatingSession}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b border-slate-100 flex items-center px-4 gap-2 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">
              {activeSession?.title || texts.lawyer.assistant.title}
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
              variant="lawyer"
              title={texts.lawyer.assistant.emptyTitle}
              description={texts.lawyer.assistant.emptyDescription}
              suggestions={suggestions}
              onSuggestionClick={setInput}
            />
          ) : (
            activeSession.messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} variant="lawyer" />
            ))
          )}
          {messaging.isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          {messaging.sessionLoadError === activeSessionId && activeSession && (
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
          ref={chatInputRef}
          variant="lawyer"
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={messaging.isLoading}
          placeholder={texts.lawyer.assistant.inputPlaceholder}
          pendingFiles={pendingFiles}
          onAddFiles={addFiles}
          onRemoveFile={removePendingFile}
          hint={texts.lawyer.assistant.inputHint}
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
                  {texts.common.cancel}
                </button>
                <button
                  onClick={handleSaveTitle}
                  className={`px-4 py-2 ${tw.btnPrimary} rounded-xl transition-colors inline-flex items-center gap-2`}
                >
                  <Check className="w-4 h-4" />
                  {texts.common.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
