import React, { useState, useEffect } from 'react';
import { UserCircle, Plus } from 'lucide-react';
import {
  listAgents,
  createAgent,
  nameToCode,
  type AgentInfo,
} from '../../services/agents';
import {
  SYSTEM_AGENT_CODE,
  SYSTEM_ASSISTANT_AGENT_CODE,
  SYSTEM_SERVICE_AGENT_CODE,
} from '../../config/api';
import DigitalTwinEditView from './DigitalTwinEditView';
import { texts, tw } from '../../themes';

/** 需要排除的系统 Agent code 集合 */
const SYSTEM_AGENT_CODES = new Set(
  [SYSTEM_AGENT_CODE, SYSTEM_ASSISTANT_AGENT_CODE, SYSTEM_SERVICE_AGENT_CODE]
    .filter((c): c is string => !!c?.trim())
    .map((c) => c.trim().toLowerCase())
);

/** 过滤掉系统预设 Agent */
function filterSystemAgents(agents: AgentInfo[]): AgentInfo[] {
  if (SYSTEM_AGENT_CODES.size === 0) return agents;
  return agents.filter((a) => {
    const code = a.code?.trim().toLowerCase();
    return !code || !SYSTEM_AGENT_CODES.has(code);
  });
}

export default function DigitalTwinView() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 加载草稿和已发布的数字分身
  const loadAgents = React.useCallback(async () => {
    const [draftList, activeList] = await Promise.all([
      listAgents({ status: 'draft', limit: 100 }),
      listAgents({ status: 'active', limit: 100 }),
    ]);
    const combined = [...draftList, ...activeList];
    const uniqueById = Array.from(new Map(combined.map((a) => [a.id, a])).values());
    return filterSystemAgents(uniqueById);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await loadAgents();
        if (!cancelled) setAgents(list);
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAgents]);

  const hasTwin = agents.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <div className={`w-10 h-10 border-2 ${tw.spinnerBorder} border-t-transparent rounded-full animate-spin`} />
        <p className="mt-3 text-sm">{texts.common.loading}</p>
      </div>
    );
  }

  const handleCreate = async () => {
    const name = createName.trim() || '我的数字分身';
    setCreating(true);
    setCreateError('');
    try {
      const code = nameToCode(name);
      await createAgent({ name, code, description: createDesc.trim() || undefined, status: 'draft' });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      const list = await loadAgents();
      setAgents(list);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  if (!hasTwin) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className={`w-20 h-20 ${tw.iconBg} rounded-full mx-auto flex items-center justify-center ${tw.iconColor}`}>
            <UserCircle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{texts.lawyer.twin.title}</h2>
          <p className="text-sm text-slate-500 mt-2">{texts.lawyer.twin.description}</p>
        </div>
        <p className="text-slate-500 text-sm">{texts.lawyer.twin.noTwin}</p>
        <button
          onClick={() => setShowCreate(true)}
          className={`w-full py-4 ${tw.btnPrimary} rounded-2xl font-bold shadow-lg ${tw.btnShadow} transition-colors flex items-center justify-center gap-2`}
        >
          <Plus className="w-5 h-5" />
          {texts.lawyer.twin.addTwin}
        </button>

        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold text-slate-900">{texts.lawyer.twin.createTitle}</h3>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <input
                type="text"
                placeholder={texts.lawyer.twin.namePlaceholder}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus}`}
              />
              <textarea
                placeholder={texts.lawyer.twin.descPlaceholder}
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus} resize-none`}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  {texts.common.cancel}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className={`flex-1 py-3 ${tw.btnPrimary} rounded-xl font-bold disabled:opacity-50`}
                >
                  {creating ? texts.common.creating : texts.common.create}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const firstAgent = agents[0];
  return (
    <DigitalTwinEditView
      agentId={firstAgent.id}
      agentStatus={firstAgent.status}
      onRefresh={async () => {
        const list = await loadAgents();
        setAgents(list);
      }}
    />
  );
}
