/**
 * 律小乖 法律主题 - 颜色配置
 * 
 * 设计理念：专业、稳重、可信赖
 * - 靛蓝色：权威、专业、法律
 * - 琥珀金：智慧、信任
 * - 深灰：庄严、公正
 */
export const colors = {
  // 主色调（靛蓝色 - 法律专业）
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primaryLight: '#6366f1',
  
  // 律师端色（琥珀金 - 智慧信任）
  lawyer: '#d97706',
  lawyerDark: '#b45309',
  lawyerLight: '#f59e0b',
  
  // 司法端色（深灰 - 庄严公正）
  judiciary: '#374151',
  judiciaryDark: '#1f2937',
  judiciaryLight: '#4b5563',
  
  // 强调色（靛蓝）
  accent: '#6366f1',
  accentLight: '#818cf8',
  
  // 背景色
  bgLight: '#f9fafb',
  bgDark: '#111827',
  
  // 状态色
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
} as const;

/**
 * Tailwind 类名预设
 */
export const tw = {
  // 主色按钮（靛蓝）
  btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  btnPrimaryDisabled: 'bg-indigo-600/50 text-white cursor-not-allowed',
  
  // 律师端按钮（琥珀）
  btnLawyer: 'bg-amber-600 hover:bg-amber-700 text-white',
  
  // 次要按钮
  btnSecondary: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50',
  
  // 输入框焦点
  inputFocus: 'focus:ring-indigo-500/30 focus:border-indigo-500',
  inputFocusLawyer: 'focus:ring-amber-500/30 focus:border-amber-500',
  
  // 链接色
  link: 'text-indigo-600 hover:underline',
  linkLawyer: 'text-amber-600 hover:underline',
  
  // 激活状态（侧边栏、标签页等）
  active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  activeLawyer: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'hover:bg-gray-100 text-gray-600',
  
  // 图标背景
  iconBg: 'bg-indigo-100',
  iconColor: 'text-indigo-600',
  iconBgLawyer: 'bg-amber-100',
  iconColorLawyer: 'text-amber-600',
  
  // 消息气泡
  msgUser: 'bg-indigo-600 text-white rounded-tr-none',
  msgUserLawyer: 'bg-amber-600 text-white rounded-tr-none',
  msgAssistant: 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none',
  
  // 发送按钮
  sendActive: 'bg-indigo-600 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700',
  sendActiveLawyer: 'bg-amber-600 shadow-lg shadow-amber-600/30 hover:bg-amber-700',
  sendDisabled: 'bg-gray-200 text-gray-400 cursor-not-allowed',
  
  // 顶部渐变条（靛蓝到琥珀的专业渐变）
  topGradient: 'bg-gradient-to-r from-indigo-600 via-purple-500 to-amber-500',
  
  // 标签页激活指示器（律师端用琥珀）
  tabIndicator: 'bg-amber-600',
  tabActive: 'text-amber-600',
  tabInactive: 'text-gray-400 hover:text-gray-600',
  
  // 角色选择按钮背景
  roleAccentIndividual: 'bg-indigo-600',
  roleAccentLawyer: 'bg-amber-600',
  roleAccentJudiciary: 'bg-gray-700',
  
  // Logo/品牌图标背景
  logoBg: 'bg-indigo-600',
  
  // Hover 效果
  hoverPrimary: 'hover:text-indigo-600 hover:bg-indigo-50',
  hoverAccent: 'hover:bg-indigo-100',
  
  // 边框色
  borderAccent: 'border-indigo-200',
  
  // 加载动画
  spinnerBorder: 'border-indigo-600',
  spinnerColor: 'text-indigo-600',
  
  // 按钮阴影
  btnShadow: 'shadow-indigo-600/20',
  
  // 头像边框
  avatarBorder: 'border-indigo-200',
  
  // 菜单 hover
  menuHover: 'hover:bg-indigo-50 hover:text-indigo-600',
} as const;

export type ThemeColors = typeof colors;
export type ThemeTw = typeof tw;
