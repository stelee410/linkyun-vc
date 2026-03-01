/**
 * 技能 API - 创作者技能、市场
 * 文档: docs/API使用指南.md §4.8
 */
import { requestWithAuth, parseJsonResponse } from './api';

export interface SkillItem {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

/** 创作者已添加的技能 - GET /api/v1/creator-skills */
export async function getCreatorSkills(): Promise<SkillItem[]> {
  const res = await requestWithAuth('/api/v1/creator-skills', { method: 'GET' });
  const data = await parseJsonResponse<SkillItem[] | { creator_skills?: SkillItem[]; items?: SkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.creator_skills ?? data?.items ?? [];
}

/** 市场技能列表 - GET /api/v1/skills/marketplace */
export async function getMarketplaceSkills(): Promise<SkillItem[]> {
  const res = await requestWithAuth('/api/v1/skills/marketplace', { method: 'GET' });
  const data = await parseJsonResponse<SkillItem[] | { skills?: SkillItem[]; items?: SkillItem[] }>(res);
  if (Array.isArray(data)) return data;
  return data?.skills ?? data?.items ?? [];
}

/** 从市场添加技能到创作者 - POST /api/v1/creator-skills */
export async function addCreatorSkill(params: { skill_id?: string; skill_code?: string; name?: string }): Promise<SkillItem> {
  const res = await requestWithAuth('/api/v1/creator-skills', {
    method: 'POST',
    body: params as Record<string, unknown>,
  });
  return parseJsonResponse<SkillItem>(res);
}

/** 检查并确保创作者已拥有指定技能（从 marketplace 添加）；若已存在则跳过 */
export async function ensureCreatorHasSkill(
  codePattern: RegExp
): Promise<boolean> {
  const [creatorSkills, marketplaceSkills] = await Promise.all([
    getCreatorSkills(),
    getMarketplaceSkills(),
  ]);
  const hasIt = creatorSkills.some((s) => codePattern.test(String(s.code ?? s.name ?? '')));
  if (hasIt) return true;

  const marketSkill = marketplaceSkills.find((s) =>
    codePattern.test(String(s.code ?? s.name ?? ''))
  );
  if (!marketSkill?.id) return false;

  await addCreatorSkill({
    skill_id: marketSkill.id,
    name: marketSkill.name || marketSkill.code || 'skill',
  });
  return true;
}
