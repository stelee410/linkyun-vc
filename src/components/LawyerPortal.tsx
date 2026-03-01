import React, { useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot, UserCircle, Database, LogOut, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import AssistantView from './lawyer/AssistantView';
import DigitalTwinView from './lawyer/DigitalTwinView';
import KnowledgeBaseView from './lawyer/KnowledgeBaseView';
import { clearAuth } from '../lib/authStorage';
import { texts, tw } from '../themes';

type Tab = 'assistant' | 'twin' | 'knowledge';

const validTabs: Tab[] = ['assistant', 'twin', 'knowledge'];

export default function LawyerPortal() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  
  const activeTab: Tab = validTabs.includes(tab as Tab) ? (tab as Tab) : 'assistant';
  
  if (!tab || !validTabs.includes(tab as Tab)) {
    return <Navigate to="/lawyer/assistant" replace />;
  }

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [navigate]);

  const tabs = [
    { id: 'assistant', label: texts.lawyer.tabs.assistant, icon: Bot },
    { id: 'twin', label: texts.lawyer.tabs.twin, icon: UserCircle },
    { id: 'knowledge', label: texts.lawyer.tabs.knowledge, icon: Database },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${tw.logoBg} rounded-lg flex items-center justify-center text-white`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-slate-900">{texts.lawyer.headerTitle}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'assistant' ? (
          <AssistantView />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {activeTab === 'twin' && <DigitalTwinView />}
              {activeTab === 'knowledge' && <KnowledgeBaseView />}
            </div>
          </div>
        )}
      </main>

      <nav className="bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center sticky bottom-0">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => navigate(`/lawyer/${tabItem.id}`)}
            className={cn(
              'flex flex-col items-center gap-1 transition-all',
              activeTab === tabItem.id ? tw.tabActive : tw.tabInactive
            )}
          >
            <tabItem.icon className={cn('w-6 h-6', activeTab === tabItem.id && 'scale-110')} />
            <span className="text-[10px] font-medium">{tabItem.label}</span>
            {activeTab === tabItem.id && (
              <motion.div
                layoutId="activeTab"
                className={`w-1 h-1 ${tw.tabIndicator} rounded-full mt-0.5`}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
