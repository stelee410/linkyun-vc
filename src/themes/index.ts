/**
 * 主题入口
 * 
 * 通过环境变量 VITE_SITE_THEME 切换主题
 * 可用值：
 * - vc: 凌云资本 VC 深蓝色主题（为风险投资服务）
 * - legalwise: 律小乖 法律主题（律师给用户提供专业的法律咨询服务，默认）
 */

import * as vcTheme from './vc';
import * as legalwiseTheme from './legalwise';

const THEME = import.meta.env.VITE_SITE_THEME || 'legalwise';

const themes = {
  vc: vcTheme,
  legalwise: legalwiseTheme,
} as const;

type ThemeKey = keyof typeof themes;

const currentTheme = themes[THEME as ThemeKey] || themes.legalwise;

export const { colors, tw, texts } = currentTheme;
export type { ThemeColors, ThemeTw } from './vc';
export type { ThemeTexts } from './vc';
