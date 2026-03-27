/**
 * 医疗健康主题 - 颜色配置
 *
 * 设计理念：安心、专业、洁净
 * - 青绿色：生命、健康、疗愈
 * - 天蓝色：医护、专业、可信
 * - 深灰：院务与管理端的稳重
 */
export const colors = {
  // 主色调（青绿 - 健康与关怀）
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#14b8a6',

  // 医护端色（天蓝 - 临床与专业）
  lawyer: '#0284c7',
  lawyerDark: '#0369a1',
  lawyerLight: '#0ea5e9',

  // 院务端色（深灰 - 管理稳重）
  judiciary: '#334155',
  judiciaryDark: '#1e293b',
  judiciaryLight: '#475569',

  // 强调色
  accent: '#14b8a6',
  accentLight: '#5eead4',

  // 背景色
  bgLight: '#f0fdfa',
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
  // 主色按钮（青绿）
  btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white',
  btnPrimaryDisabled: 'bg-teal-600/50 text-white cursor-not-allowed',

  // 医护端按钮（天蓝）
  btnLawyer: 'bg-sky-600 hover:bg-sky-700 text-white',

  // 次要按钮
  btnSecondary: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50',

  // 输入框焦点
  inputFocus: 'focus:ring-teal-500/30 focus:border-teal-500',
  inputFocusLawyer: 'focus:ring-sky-500/30 focus:border-sky-500',

  // 链接色
  link: 'text-teal-600 hover:underline',
  linkLawyer: 'text-sky-600 hover:underline',

  // 激活状态（侧边栏、标签页等）
  active: 'bg-teal-50 text-teal-800 border-teal-200',
  activeLawyer: 'bg-sky-50 text-sky-800 border-sky-200',
  inactive: 'hover:bg-gray-100 text-gray-600',

  // 图标背景
  iconBg: 'bg-teal-100',
  iconColor: 'text-teal-600',
  iconBgLawyer: 'bg-sky-100',
  iconColorLawyer: 'text-sky-600',

  // 消息气泡
  msgUser: 'bg-teal-600 text-white rounded-tr-none',
  msgUserLawyer: 'bg-sky-600 text-white rounded-tr-none',
  msgAssistant: 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none',

  // 发送按钮
  sendActive: 'bg-teal-600 shadow-lg shadow-teal-600/30 hover:bg-teal-700',
  sendActiveLawyer: 'bg-sky-600 shadow-lg shadow-sky-600/30 hover:bg-sky-700',
  sendDisabled: 'bg-gray-200 text-gray-400 cursor-not-allowed',

  // 顶部渐变条（青绿到天蓝的洁净渐变）
  topGradient: 'bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500',

  // 标签页激活指示器（医护端用天蓝）
  tabIndicator: 'bg-sky-600',
  tabActive: 'text-sky-600',
  tabInactive: 'text-gray-400 hover:text-gray-600',

  // 角色选择按钮背景
  roleAccentIndividual: 'bg-teal-600',
  roleAccentLawyer: 'bg-sky-600',
  roleAccentJudiciary: 'bg-slate-600',

  // Logo/品牌图标背景
  logoBg: 'bg-teal-600',

  // Hover 效果
  hoverPrimary: 'hover:text-teal-600 hover:bg-teal-50',
  hoverAccent: 'hover:bg-teal-100',

  // 边框色
  borderAccent: 'border-teal-200',

  // 加载动画
  spinnerBorder: 'border-teal-600',
  spinnerColor: 'text-teal-600',

  // 按钮阴影
  btnShadow: 'shadow-teal-600/20',

  // 头像边框
  avatarBorder: 'border-teal-200',

  // 菜单 hover
  menuHover: 'hover:bg-teal-50 hover:text-teal-600',
} as const;

export type ThemeColors = typeof colors;
export type ThemeTw = typeof tw;
