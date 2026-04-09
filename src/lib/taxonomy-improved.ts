/**
 * 改进的相关项目推荐算法
 * 解决原有算法的问题：
 * 1. 添加负向过滤
 * 2. 调整评分权重
 * 3. 优化性能
 * 4. 提高推荐质量
 */

import db from './db';
import type { RepositoryAnalysisResult, RepositoryDeepReadResult } from './project-analysis';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  type ProjectSemanticProfile,
} from './semantic-profile';
import { parseTopics } from './taxonomy';

export interface ImprovedRelatedProjectItem {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  project_type: string | null;
  reason: string[];
  score: number;
  matchType: 'strong' | 'medium' | 'weak';
}

interface RelatedProjectRow {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  topics: string | null;
  project_type: string | null;
  semantic_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function intersectNormalized(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((item) => normalizeText(item)));
  return left.filter((item) => rightSet.has(normalizeText(item)));
}

function dedupeStrings(values: string[], limit: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = normalizeText(trimmed);

    if (!trimmed || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(trimmed);
  }

  return result.slice(0, limit);
}

const ignoredPhrases = new Set([
  '开源项目',
  '项目介绍',
  '工具',
  '项目',
  '应用',
  '平台',
  '当前仓库信息不足',
  '暂时无法准确提炼其核心问题',
]);

function extractFunctionalPhrases(value: string | null | undefined, limit: number): string[] {
  return dedupeStrings(
    (value || '')
      .split(/[，。；;、,.!?\n|/]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2 && part.length <= 32)
      .filter((part) => !ignoredPhrases.has(part)),
    limit
  );
}

function buildFunctionalIntentTerms(profile: ProjectSemanticProfile): string[] {
  return dedupeStrings(
    [
      ...profile.useCases,
      ...profile.capabilities,
      ...extractFunctionalPhrases(profile.problemSolved, 3),
      ...extractFunctionalPhrases(profile.summary, 2),
    ],
    10
  );
}

/**
 * 负向过滤：排除明显不相关的项目
 */
function shouldFilterOut(
  current: RelatedProjectRow,
  candidate: RelatedProjectRow,
  currentProfile: ProjectSemanticProfile,
  candidateProfile: ProjectSemanticProfile
): boolean {
  // 1. 语言差异太大（除非是跨语言工具）
  const currentLang = normalizeText(current.language);
  const candidateLang = normalizeText(candidate.language);
  const crossLanguageTypes = new Set(['cli', 'tool', 'docs', 'awesome-list', 'content']);

  if (
    currentLang &&
    candidateLang &&
    currentLang !== candidateLang &&
    !crossLanguageTypes.has(normalizeText(current.project_type)) &&
    !crossLanguageTypes.has(normalizeText(candidate.project_type))
  ) {
    // 允许一些常见的跨语言组合
    const allowedCombos = [
      ['typescript', 'javascript'],
      ['javascript', 'typescript'],
      ['python', 'jupyter notebook'],
      ['c++', 'c'],
      ['c', 'c++'],
    ];

    const isAllowedCombo = allowedCombos.some(
      ([lang1, lang2]) => currentLang === lang1 && candidateLang === lang2
    );

    if (!isAllowedCombo) {
      return true;
    }
  }

  // 2. 项目类型差异太大
  const currentType = normalizeText(current.project_type);
  const candidateType = normalizeText(candidate.project_type);
  const incompatibleTypes = [
    ['docs', 'app'],
    ['docs', 'library'],
    ['awesome-list', 'app'],
    ['awesome-list', 'library'],
    ['content', 'app'],
    ['content', 'library'],
  ];

  const hasIncompatibleType = incompatibleTypes.some(
    ([type1, type2]) =>
      (currentType === type1 && candidateType === type2) ||
      (currentType === type2 && candidateType === type1)
  );

  if (hasIncompatibleType) {
    return true;
  }

  // 3. 聚类完全不相关
  const sharedClusters = intersectNormalized(
    currentProfile.semanticTags,
    candidateProfile.semanticTags
  );

  if (sharedClusters.length === 0 && currentProfile.primaryCluster !== candidateProfile.primaryCluster) {
    // 如果没有任何聚类重叠，且主聚类也不同，检查是否有其他强关联
    const hasStrongConnection =
      intersectNormalized(currentProfile.useCases, candidateProfile.useCases).length > 0 ||
      intersectNormalized(currentProfile.capabilities, candidateProfile.capabilities).length > 0;

    if (!hasStrongConnection) {
      return true;
    }
  }

  return false;
}

/**
 * 改进的评分算法
 */
function calculateImprovedScore(
  current: RelatedProjectRow,
  candidate: RelatedProjectRow,
  currentProfile: ProjectSemanticProfile,
  candidateProfile: ProjectSemanticProfile
): { score: number; functionalScore: number; reasons: Set<string> } {
  const reasons = new Set<string>();
  let score = 0;
  let functionalScore = 0;

  const currentTopics = parseTopics(current.topics);
  const candidateTopics = parseTopics(candidate.topics);
  const currentFunctionalTerms = buildFunctionalIntentTerms(currentProfile);
  const candidateFunctionalTerms = buildFunctionalIntentTerms(candidateProfile);
  const currentProblemSignals = extractFunctionalPhrases(currentProfile.problemSolved, 3);
  const candidateProblemSignals = extractFunctionalPhrases(candidateProfile.problemSolved, 3);

  // 1. 用途匹配（降低权重从7到5）
  const sharedUseCases = intersectNormalized(currentProfile.useCases, candidateProfile.useCases).slice(0, 3);
  if (sharedUseCases.length > 0) {
    reasons.add(`用途接近：${sharedUseCases.join(' / ')}`);
    score += sharedUseCases.length * 5;
    functionalScore += sharedUseCases.length * 5;
  }

  // 2. 能力匹配（保持权重5）
  const sharedCapabilities = intersectNormalized(currentProfile.capabilities, candidateProfile.capabilities).slice(0, 3);
  if (sharedCapabilities.length > 0) {
    reasons.add(`能力相近：${sharedCapabilities.join(' / ')}`);
    score += sharedCapabilities.length * 5;
    functionalScore += sharedCapabilities.length * 5;
  }

  // 3. 问题匹配（提高权重从4到6）
  const sharedProblemSignals = intersectNormalized(currentProblemSignals, candidateProblemSignals).slice(0, 2);
  if (sharedProblemSignals.length > 0) {
    reasons.add(`解决问题接近：${sharedProblemSignals.join(' / ')}`);
    score += sharedProblemSignals.length * 6;
    functionalScore += sharedProblemSignals.length * 6;
  }

  // 4. 功能意图匹配（提高权重从3到4）
  const sharedIntentTerms = intersectNormalized(currentFunctionalTerms, candidateFunctionalTerms).slice(0, 3);
  if (sharedIntentTerms.length > 0) {
    reasons.add(`功能意图重合：${sharedIntentTerms.join(' / ')}`);
    score += sharedIntentTerms.length * 4;
    functionalScore += sharedIntentTerms.length * 4;
  }

  // 5. 关键词匹配（提高权重从1到2）
  const sharedKeywords = intersectNormalized(currentProfile.keywords, candidateProfile.keywords).slice(0, 3);
  if (sharedKeywords.length > 0) {
    reasons.add(`关键词重合：${sharedKeywords.join(' / ')}`);
    score += sharedKeywords.length * 2;
  }

  // 6. Topic 匹配（提高权重从1到2）
  const sharedTopics = intersectNormalized(currentTopics, candidateTopics).slice(0, 2);
  if (sharedTopics.length > 0) {
    reasons.add(`Topic 交集：${sharedTopics.join(' / ')}`);
    score += sharedTopics.length * 2;
  }

  // 7. 语义标签匹配（保持权重2）
  const clusterLookup = getSemanticClusterLookup();
  const sharedTags = intersectNormalized(currentProfile.semanticTags, candidateProfile.semanticTags).slice(0, 2);
  if (sharedTags.length > 0) {
    for (const tag of sharedTags) {
      const cluster = clusterLookup.get(tag);
      reasons.add(`都和 ${cluster?.label || tag} 相关`);
    }
    score += sharedTags.length * 2;
  }

  // 8. 主聚类匹配（提高权重从3到4）
  if (currentProfile.primaryCluster === candidateProfile.primaryCluster) {
    const cluster = clusterLookup.get(candidateProfile.primaryCluster);
    reasons.add(`同属 ${cluster?.label || candidateProfile.primaryCluster}`);
    score += 4;
  }

  // 9. 项目类型匹配（保持权重1）
  if (current.project_type && candidate.project_type && current.project_type === candidate.project_type) {
    reasons.add('项目形态接近');
    score += 1;
  }

  // 10. 语言匹配加分（新增）
  if (current.language && candidate.language && normalizeText(current.language) === normalizeText(candidate.language)) {
    score += 1;
  }

  // 11. 流行度加分（新增，但权重很低）
  if (candidate.stars >= 10000) {
    score += 1;
  } else if (candidate.stars >= 5000) {
    score += 0.5;
  }

  return { score, functionalScore, reasons };
}

/**
 * 改进的相关项目推荐
 */
export function getImprovedRelatedProjects(
  projectId: number,
  limit = 6
): ImprovedRelatedProjectItem[] {
  const current = db.prepare(`
    SELECT id, full_name, description, one_line_intro, stars, language, one_line_status, topics, project_type,
           pa.semantic_data, pa.analysis_data, pa.deep_read_data
    FROM projects
    LEFT JOIN project_analysis pa ON pa.project_id = projects.id
    WHERE id = ?
  `).get(projectId) as RelatedProjectRow | undefined;

  if (!current) {
    return [];
  }

  const currentProfile = parseJson<ProjectSemanticProfile>(current.semantic_data) ||
    deriveProjectSemanticProfile({
      projectName: current.full_name,
      description: current.description,
      projectType: current.project_type,
      topics: parseTopics(current.topics),
      oneLineIntro: current.one_line_intro,
      analysis: parseJson<RepositoryAnalysisResult>(current.analysis_data),
      deepRead: parseJson<RepositoryDeepReadResult>(current.deep_read_data),
    });

  // 优化查询：只获取可能相关的项目
  // 1. 同语言或跨语言工具
  // 2. 同主聚类或有语义标签重叠
  const candidates = db.prepare(`
    SELECT p.id, p.full_name, p.description, p.one_line_intro, p.stars, p.language, p.one_line_status, p.topics, p.project_type,
           pa.semantic_data, pa.analysis_data, pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.id != ?
      AND p.one_line_status = 'completed'
      AND (
        p.language = ?
        OR p.project_type IN ('cli', 'tool', 'docs', 'awesome-list')
        OR ? IN ('cli', 'tool', 'docs', 'awesome-list')
      )
    ORDER BY p.stars DESC
    LIMIT 500
  `).all(projectId, current.language || '', current.project_type || '') as RelatedProjectRow[];

  const scoredProjects = candidates
    .map((candidate) => {
      const candidateProfile = parseJson<ProjectSemanticProfile>(candidate.semantic_data) ||
        deriveProjectSemanticProfile({
          projectName: candidate.full_name,
          description: candidate.description,
          projectType: candidate.project_type,
          topics: parseTopics(candidate.topics),
          oneLineIntro: candidate.one_line_intro,
          analysis: parseJson<RepositoryAnalysisResult>(candidate.analysis_data),
          deepRead: parseJson<RepositoryDeepReadResult>(candidate.deep_read_data),
        });

      // 负向过滤
      if (shouldFilterOut(current, candidate, currentProfile, candidateProfile)) {
        return null;
      }

      const { score, functionalScore, reasons } = calculateImprovedScore(
        current,
        candidate,
        currentProfile,
        candidateProfile
      );

      // 判断匹配强度
      let matchType: 'strong' | 'medium' | 'weak' = 'weak';
      if (functionalScore >= 15 || score >= 20) {
        matchType = 'strong';
      } else if (functionalScore >= 10 || score >= 12) {
        matchType = 'medium';
      }

      return {
        score,
        functionalScore,
        matchType,
        project: {
          id: candidate.id,
          full_name: candidate.full_name,
          description: candidate.description,
          one_line_intro: candidate.one_line_intro,
          stars: candidate.stars,
          language: candidate.language,
          one_line_status: candidate.one_line_status,
          project_type: candidate.project_type,
          reason: [...reasons].slice(0, 3),
          score,
          matchType,
        } satisfies ImprovedRelatedProjectItem,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    // 提高过滤阈值
    .filter((item) => item.functionalScore >= 10 || item.score >= 12)
    .sort((left, right) => {
      // 优先按匹配强度排序
      const matchTypeOrder = { strong: 0, medium: 1, weak: 2 };
      const matchTypeDiff = matchTypeOrder[left.matchType] - matchTypeOrder[right.matchType];
      if (matchTypeDiff !== 0) return matchTypeDiff;

      // 然后按分数排序
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) return scoreDiff;

      // 最后按 stars 排序
      return right.project.stars - left.project.stars;
    })
    .slice(0, limit)
    .map((item) => item.project);

  return scoredProjects;
}
