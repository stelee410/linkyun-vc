import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, Trash2, LogOut, X, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatSession } from '../../types';
import { texts, tw } from '../../themes';

type Variant = 'individual' | 'lawyer';

const variantStyles = {
  individual: {
    active: tw.active,
    inactive: tw.inactive,
    menuHover: tw.menuHover,
  },
  lawyer: {
    active: tw.active,
    inactive: tw.inactive,
    menuHover: tw.menuHover,
  },
};

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

interface ChatSidebarProps {
  variant?: Variant;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onLogout?: () => void;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  creatingSession?: boolean;
  menuItems?: MenuItem[];
}

export default function ChatSidebar({
  variant = 'individual',
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onLogout,
  isSidebarOpen,
  onCloseSidebar,
  creatingSession = false,
  menuItems = [],
}: ChatSidebarProps) {
  const styles = variantStyles[variant];

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseSidebar}
            className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 border-r border-slate-100 flex flex-col transition-transform md:relative md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900">{texts.brand.name}</h2>
          <button onClick={onCloseSidebar} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={onCreateSession}
            disabled={creatingSession}
            className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {creatingSession ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {texts.individual.newChat}
          </button>

          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors text-slate-600',
                styles.menuHover,
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {sessions.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{texts.individual.historyTitle}</h3>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all group border',
                activeSessionId === session.id
                  ? `${styles.active} border`
                  : `${styles.inactive} border-transparent`
              )}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block truncate">{session.title}</span>
                {session.agentName && (
                  <span className="block text-xs text-slate-400 truncate">
                    {session.agentName}
                  </span>
                )}
              </div>
              <Trash2
                className="w-4 h-4 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shrink-0"
                onClick={(e) => onDeleteSession(session.id, e)}
              />
            </button>
          ))}
        </div>

        {onLogout && (
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 p-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              {texts.common.logout}
            </button>
          </div>
        )}
      </motion.aside>
    </>
  );
}
