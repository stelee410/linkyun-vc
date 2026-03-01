import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, Smartphone, Lock, ShieldCheck, ChevronDown, Mail, User, KeyRound, LogOut, ShieldX } from 'lucide-react';
import { Role } from '../types';
import { cn } from '../lib/utils';
import { login, register } from '../services/auth';
import { setAuth, clearAuth, setWorkspace } from '../lib/authStorage';
import { isApiError } from '../types/auth';
import { WORKSPACE_CODE, WORKSPACE_JOIN_CODE, REGISTER_INVITATION_CODE } from '../config/api';
import { getUserWorkspaces, joinWorkspace, switchWorkspace } from '../services/workspace';
import { texts, tw } from '../themes';

type AccessDeniedInfo = {
  role: Role;
  message: string;
} | null;

export default function Login() {
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('individual');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState(REGISTER_INVITATION_CODE ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState<AccessDeniedInfo>(null);

  const roles = [
    { id: texts.roles.individual.id, title: texts.roles.individual.title, accent: tw.roleAccentIndividual },
    { id: texts.roles.lawyer.id, title: texts.roles.lawyer.title, accent: tw.roleAccentLawyer },
    { id: texts.roles.judiciary.id, title: texts.roles.judiciary.title, accent: tw.roleAccentJudiciary }
  ];

  const checkRolePermission = async (targetRole: Role): Promise<boolean> => {
    if (targetRole !== 'lawyer') return true;
    try {
      const workspaces = await getUserWorkspaces();
      const targetCode = WORKSPACE_CODE?.trim();
      if (!targetCode) return true;
      const currentWorkspace = workspaces.find(
        (item) => (item.workspace?.code ?? (item as { code?: string }).code) === targetCode
      );
      const userRole = currentWorkspace?.role;
      if (userRole === 'owner' || userRole === 'admin') {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  };

  const handleAccessDeniedLogout = () => {
    clearAuth();
    setAccessDenied(null);
    setPassword('');
  };

  const ensureInWorkspace = async (): Promise<void> => {
    const targetCode = WORKSPACE_CODE?.trim();
    const joinCode = WORKSPACE_JOIN_CODE?.trim();
    if (!targetCode) return;
    const list = await getUserWorkspaces();
    const currentWorkspaceItem = list.find(
      (item) => (item.workspace?.code ?? (item as { code?: string }).code) === targetCode
    );
    if (currentWorkspaceItem) {
      await switchWorkspace(targetCode);
      const ws = currentWorkspaceItem.workspace;
      if (ws?.id) {
        setWorkspace({ id: String(ws.id), code: ws.code, name: ws.name });
      }
      return;
    }
    if (joinCode) {
      await joinWorkspace(joinCode);
      await switchWorkspace(targetCode);
      const updatedList = await getUserWorkspaces();
      const joinedWorkspace = updatedList.find(
        (item) => (item.workspace?.code ?? (item as { code?: string }).code) === targetCode
      );
      const ws = joinedWorkspace?.workspace;
      if (ws?.id) {
        setWorkspace({ id: String(ws.id), code: ws.code, name: ws.name });
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      const res = await login({ username: username.trim(), password });
      if (isApiError(res)) {
        setErrorMessage(res.error.message || '登录失败');
        return;
      }
      const { api_key, user, creator } = res.data;
      setAuth(api_key, user || creator ? { id: (user?.id ?? (creator as { id?: string })?.id) ?? '', username: (user as { username?: string })?.username ?? (creator as { username?: string })?.username } : undefined);
      if (WORKSPACE_CODE?.trim()) {
        await ensureInWorkspace();
      }
      const hasPermission = await checkRolePermission(selectedRole);
      if (!hasPermission) {
        setAccessDenied({
          role: selectedRole,
          message: texts.login.accessDeniedMsg,
        });
        return;
      }
      navigate(`/${selectedRole}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedRole) return;
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedInvitation = invitationCode.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 100) {
      setErrorMessage('用户名为 3–100 个字符');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('密码至少 8 位');
      return;
    }
    if (!trimmedInvitation) {
      setErrorMessage('请输入邀请码');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await register({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        invitation_code: trimmedInvitation,
      });
      if (isApiError(res)) {
        setErrorMessage(res.error.message || '注册失败');
        return;
      }
      const { api_key, user, creator } = res.data;
      setAuth(api_key, user || creator ? { id: (user?.id ?? (creator as { id?: string })?.id) ?? '', username: (user as { username?: string })?.username ?? (creator as { username?: string })?.username } : undefined);
      if (WORKSPACE_CODE?.trim()) {
        await ensureInWorkspace();
      }
      navigate(`/${selectedRole}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleData = roles.find(r => r.id === selectedRole);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 ${tw.topGradient}`} />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md z-10"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl text-red-600 mb-4 shadow-xl"
            >
              <ShieldX className="w-8 h-8" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{texts.login.accessDenied}</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl shadow-gray-100/50 text-center"
          >
            <div className="mb-8">
              <p className="text-gray-600 leading-relaxed">
                {accessDenied.message}
              </p>
            </div>

            <button
              onClick={handleAccessDeniedLogout}
              className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {texts.login.goLogin}
            </button>
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-12">
            {texts.brand.copyright}<br />
            {texts.brand.icp}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${tw.topGradient}`} />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-slate-100 rounded-full blur-3xl opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`inline-flex items-center justify-center w-16 h-16 ${tw.logoBg} rounded-2xl text-white mb-4 shadow-xl`}
          >
            <TrendingUp className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{texts.brand.name}</h1>
          <p className="text-slate-500 mt-2">{texts.brand.description}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50"
        >
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900">{isRegisterMode ? texts.login.register : texts.login.welcome}</h2>
            <p className="text-sm text-gray-500">
              {isRegisterMode ? texts.login.registerHint : texts.login.loginHint}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {errorMessage}
            </div>
          )}

          {isRegisterMode ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">用户名（3–100 字符）</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="email"
                    required
                    placeholder="请输入邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">密码（至少 8 位）</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">邀请码（必填）</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    required
                    placeholder="请输入邀请码"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  currentRoleData?.accent || 'bg-gray-900',
                  isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <> <ShieldCheck className="w-5 h-5" /> {texts.login.registerButton} </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">用户名 / 邮箱</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="text"
                    required
                    placeholder="请输入用户名或邮箱"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">登录密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    type="password"
                    required
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} focus:bg-white transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">登录身份</label>
                <div className="relative">
                  <select
                    value={selectedRole || ''}
                    onChange={(e) => setSelectedRole(e.target.value as Role)}
                    className="w-full pl-4 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all appearance-none cursor-pointer text-gray-700"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm px-1">
                <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  记住我
                </label>
                <button type="button" className={cn(tw.link, 'font-medium')}>{texts.login.forgotPassword}</button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  currentRoleData?.accent || 'bg-gray-900',
                  isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <> <ShieldCheck className="w-5 h-5" /> {texts.login.loginButton} </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-500">
              {isRegisterMode ? (
                <>{texts.login.hasAccount} <button type="button" onClick={() => { setIsRegisterMode(false); setErrorMessage(''); }} className={cn(tw.link, 'font-bold')}>{texts.login.goLogin}</button></>
              ) : (
                <>{texts.login.noAccount} <button type="button" onClick={() => { setIsRegisterMode(true); setErrorMessage(''); }} className={cn(tw.link, 'font-bold')}>{texts.login.goRegister}</button></>
              )}
            </p>
          </div>
        </motion.div>

        <p className="text-center text-xs text-slate-400 mt-12">
          {texts.brand.copyright}<br />
          {texts.brand.icp}
        </p>
      </motion.div>
    </div>
  );
}
