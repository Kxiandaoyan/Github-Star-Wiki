/**
 * 改进的搜索功能
 * 解决原有问题：
 * 1. 移除800条限制
 * 2. 优化评分逻辑
 * 3. 使用 FTS 预筛选
 * 4. 简化计算
 */

import db from './db';
import type { ProjectSemanticProfile } from './semantic-profile';

export interface SearchProjectRow {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  seo_title: string | null;
  seo_description: string | null;
  project_type: string | null;
  stars: number;
  language: string | null;
  topics: string | null;
  synced_at: string | null;
  created_at: string;
  one_line_status: string;
  semantic_data: string | null;
  current_task_type: string | null;
  current_task_status: string | null;
}

export interface SearchProjectsOptions {
  query?: string;
  language?: string;
  minStars?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'synced_at' | 'stars' | 'name' | 'created_at';
  order?: 'ASC' | 'DESC';
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

function parseTopics(topics: string | null | undefined): string[] {
  if (!topics) return [];
  try {
    const parsed = JSON.parse(topics) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function tokenizeQuery(query: string): string[] {
  return [...new Set(
    query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )];
}

function countTokenMatches(text: string, tokens: string[]): number {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0);
}

function getSemanticArrays(semanticData: string | null) {
  const semantic = parseJson<ProjectSemanticProfile>(semanticData);
  return {
    tags: semantic?.semanticTags || [],
    useCases: semantic?.useCases || [],
    capabilities: semantic?.capabilities || [],
    keywords: semantic?.keywords || [],
    summary: semantic?.summary || '',
    problemSolved: semantic?.problemSolved || '',
  };
}

/**
 * 改进的评分算法（简化版）
 */
function getImprovedSearchScore(project: SearchProjectRow, query: string): number {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const semantic = getSemanticArrays(project.semantic_data);
  const topics = parseTopics(project.topics);

  const fullName = normalizeText(project.full_name);
  const name = normalizeText(project.name);
  const seoTitle = normalizeText(project.seo_title);
  const oneLineIntro = normalizeText(project.one_line_intro);
  const chineseIntro = normalizeText(project.chinese_intro);
  const description = normalizeText(project.description);
  const projectType = normalizeText(project.project_type);

  let score = 0;

  // 1. 精确匹配（高权重）
  if (fullName === normalizedQuery) score += 100;
  else if (name === normalizedQuery) score += 90;
  else if (fullName.includes(normalizedQuery)) score += 50;
  else if (name.includes(normalizedQuery)) score += 45;

  // 2. 标题和简介匹配（中高权重）
  if (seoTitle.includes(normalizedQuery)) score += 35;
  if (oneLineIntro.includes(normalizedQuery)) score += 30;
  if (chineseIntro.includes(normalizedQuery)) score += 20;

  // 3. 描述匹配（中权重）
  if (description.includes(normalizedQuery)) score += 15;

  // 4. 项目类型匹配（中权重）
  if (projectType === normalizedQuery) score += 25;
  else if (projectType.includes(normalizedQuery)) score += 12;

  // 5. 语义字段匹配（中权重）
  const useCaseMatches = countTokenMatches(semantic.useCases.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const capabilityMatches = countTokenMatches(semantic.capabilities.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const keywordMatches = countTokenMatches(semantic.keywords.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const tagMatches = countTokenMatches(semantic.tags.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const topicMatches = countTokenMatches(topics.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);

  score += useCaseMatches * 20;
  score += capabilityMatches * 15;
  score += keywordMatches * 12;
  score += tagMatches * 18;
  score += topicMatches * 10;

  // 6. 问题和摘要匹配（低权重）
  const summaryMatches = countTokenMatches(
    `${semantic.summary}\n${semantic.problemSolved}`.toLowerCase(),
    [normalizedQuery, ...tokens]
  );
  score += summaryMatches * 8;

  // 7. 流行度加分（对数缩放，避免过度影响）
  score += Math.min(10, Math.log10(Math.max(10, project.stars)));

  return score;
}

const currentTaskTypeSql = `
  (
    SELECT tq.task_type
    FROM task_queue tq
    WHERE tq.project_id = p.id
      AND tq.status IN ('processing', 'pending')
    ORDER BY
      CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
      tq.priority ASC,
      COALESCE(tq.available_at, tq.created_at) ASC,
      tq.created_at ASC,
      tq.id ASC
    LIMIT 1
  ) AS current_task_type
`;

const currentTaskStatusSql = `
  (
    SELECT tq.status
    FROM task_queue tq
    WHERE tq.project_id = p.id
      AND tq.status IN ('processing', 'pending')
    ORDER BY
      CASE tq.status WHEN 'processing' THEN 0 ELSE 1 END,
      tq.priority ASC,
      COALESCE(tq.available_at, tq.created_at) ASC,
      tq.created_at ASC,
      tq.id ASC
    LIMIT 1
  ) AS current_task_status
`;

/**
 * 改进的搜索功能
 */
export function searchProjectsImproved(options: SearchProjectsOptions) {
  const {
    query,
    language,
    minStars = 0,
    page = 1,
    pageSize = 21,
    sortBy = query ? 'relevance' : 'synced_at',
    order = 'DESC',
  } = options;

  const offset = (page - 1) * pageSize;

  // 构建 WHERE 条件
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (language) {
    conditions.push('p.language = ?');
    params.push(language);
  }

  if (minStars > 0) {
    conditions.push('p.stars >= ?');
    params.push(minStars);
  }

  // 如果有搜索词，使用 FTS 预筛选
  if (query) {
    const ftsQuery = tokenizeQuery(query).join(' OR ');

    // 使用 FTS 预筛选，获取候选项目 ID
    const ftsConditions = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    const ftsParams = [...params];

    const candidateIdsSql = `
      SELECT p.id
      FROM projects_fts fts
      JOIN projects p ON p.id = fts.rowid
      WHERE fts MATCH ?
        ${ftsConditions}
      ORDER BY p.stars DESC
      LIMIT 2000
    `;

    const candidateIds = db.prepare(candidateIdsSql).all(ftsQuery, ...ftsParams) as Array<{ id: number }>;

    if (candidateIds.length === 0) {
      return {
        projects: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // 获取候选项目的完整信息
    const idList = candidateIds.map((row) => row.id).join(',');
    const projectsSql = `
      SELECT
        p.id,
        p.full_name,
        p.name,
        p.description,
        p.one_line_intro,
        p.chinese_intro,
        p.seo_title,
        p.seo_description,
        p.project_type,
        p.stars,
        p.language,
        p.topics,
        p.synced_at,
        p.created_at,
        p.one_line_status,
        pa.semantic_data,
        ${currentTaskTypeSql},
        ${currentTaskStatusSql}
      FROM projects p
      LEFT JOIN project_analysis pa ON pa.project_id = p.id
      WHERE p.id IN (${idList})
    `;

    const projects = db.prepare(projectsSql).all() as SearchProjectRow[];

    // 计算相关性分数并排序
    const scoredProjects = projects
      .map((project) => ({
        project,
        score: getImprovedSearchScore(project, query),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        // 先按分数排序
        const scoreDiff = right.score - left.score;
        if (scoreDiff !== 0) return scoreDiff;
        // 分数相同时按 stars 排序
        return right.project.stars - left.project.stars;
      });

    const paginatedProjects = scoredProjects
      .slice(offset, offset + pageSize)
      .map((item) => item.project);

    return {
      projects: paginatedProjects,
      total: scoredProjects.length,
      page,
      pageSize,
      totalPages: Math.ceil(scoredProjects.length / pageSize),
    };
  }

  // 无搜索词时，按指定字段排序
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 获取总数
  const countSql = `
    SELECT COUNT(*) as count
    FROM projects p
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { count: number };

  // 获取项目列表
  const validSortFields = ['synced_at', 'stars', 'name', 'created_at'] as const;
  const sortField = validSortFields.includes(sortBy as typeof validSortFields[number]) ? sortBy : 'synced_at';
  const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';

  const sql = `
    SELECT
      p.id,
      p.full_name,
      p.name,
      p.description,
      p.one_line_intro,
      p.chinese_intro,
      p.seo_title,
      p.seo_description,
      p.project_type,
      p.stars,
      p.language,
      p.topics,
      p.synced_at,
      p.created_at,
      p.one_line_status,
      pa.semantic_data,
      ${currentTaskTypeSql},
      ${currentTaskStatusSql}
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    ${whereClause}
    ORDER BY p.${sortField} ${orderDirection}
    LIMIT ? OFFSET ?
  `;

  const projects = db.prepare(sql).all(...params, pageSize, offset) as SearchProjectRow[];

  return {
    projects,
    total: countResult.count,
    page,
    pageSize,
    totalPages: Math.ceil(countResult.count / pageSize),
  };
}
