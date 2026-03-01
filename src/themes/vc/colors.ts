/**
 * VC 深蓝色主题 - 颜色配置
 */
export const colors = {
  // 主色调
  primary: '#1e3a5f',
  primaryDark: '#0f2744',
  primaryLight: '#2d5a8a',
  
  // 强调色
  accent: '#4f7cac',
  accentLight: '#7ba3cc',
  
  // 背景色
  bgLight: '#f8fafc',
  bgDark: '#0f172a',
  
  // 状态色
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
} as const;

/**
 * Tailwind 类名预设
 */
export const tw = {
  // 主色按钮
  btnPrimary: 'bg-[#1e3a5f] hover:bg-[#0f2744] text-white',
  btnPrimaryDisabled: 'bg-[#1e3a5f]/50 text-white cursor-not-allowed',
  
  // 次要按钮
  btnSecondary: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
  
  // 输入框焦点
  inputFocus: 'focus:ring-[#4f7cac]/30 focus:border-[#4f7cac]',
  
  // 链接色
  link: 'text-[#4f7cac] hover:underline',
  
  // 激活状态（侧边栏、标签页等）
  active: 'bg-[#1e3a5f]/10 text-[#1e3a5f] border-[#4f7cac]/30',
  inactive: 'hover:bg-slate-100 text-slate-600',
  
  // 图标背景
  iconBg: 'bg-[#1e3a5f]/10',
  iconColor: 'text-[#1e3a5f]',
  
  // 消息气泡
  msgUser: 'bg-[#1e3a5f] text-white rounded-tr-none',
  msgAssistant: 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none',
  
  // 发送按钮
  sendActive: 'bg-[#1e3a5f] shadow-lg shadow-[#1e3a5f]/30 hover:bg-[#0f2744]',
  sendDisabled: 'bg-slate-200 text-slate-400 cursor-not-allowed',
  
  // 顶部渐变条
  topGradient: 'bg-gradient-to-r from-[#1e3a5f] via-[#4f7cac] to-slate-600',
  
  // 标签页激活指示器
  tabIndicator: 'bg-[#1e3a5f]',
  tabActive: 'text-[#1e3a5f]',
  tabInactive: 'text-slate-400 hover:text-slate-600',
  
  // 角色选择按钮背景
  roleAccentIndividual: 'bg-[#1e3a5f]',
  roleAccentLawyer: 'bg-[#0f2744]',
  roleAccentJudiciary: 'bg-slate-700',
  
  // Logo/品牌图标背景
  logoBg: 'bg-[#1e3a5f]',
  
  // Hover 效果
  hoverPrimary: 'hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10',
  hoverAccent: 'hover:bg-[#1e3a5f]/20',
  
  // 边框色
  borderAccent: 'border-[#4f7cac]/30',
  
  // 加载动画
  spinnerBorder: 'border-[#1e3a5f]',
  spinnerColor: 'text-[#4f7cac]',
  
  // 按钮阴影
  btnShadow: 'shadow-[#1e3a5f]/20',
  
  // 头像边框
  avatarBorder: 'border-[#4f7cac]/30',
  
  // 菜单 hover
  menuHover: 'hover:bg-[#1e3a5f]/10 hover:text-[#1e3a5f]',
} as const;

export type ThemeColors = typeof colors;
export type ThemeTw = typeof tw;
