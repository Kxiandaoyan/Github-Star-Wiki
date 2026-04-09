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

function parseJson<T>(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeText(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function parseTopics(topics: string | null | undefined) {
  if (!topics) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(topics) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function tokenizeQuery(query: string) {
  return [...new Set(
    query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )];
}

function includesAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function countTokenMatches(text: string, tokens: string[]) {
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

function getSearchScore(project: SearchProjectRow, query: string) {
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
  const seoDescription = normalizeText(project.seo_description);
  const projectType = normalizeText(project.project_type);

  let score = 0;

  if (fullName === normalizedQuery) score += 80;
  else if (fullName.includes(normalizedQuery)) score += 40;

  if (name === normalizedQuery) score += 72;
  else if (name.includes(normalizedQuery)) score += 34;

  if (seoTitle.includes(normalizedQuery)) score += 30;
  if (oneLineIntro.includes(normalizedQuery)) score += 28;
  if (chineseIntro.includes(normalizedQuery)) score += 18;
  if (seoDescription.includes(normalizedQuery)) score += 14;
  if (description.includes(normalizedQuery)) score += 12;
  if (projectType === normalizedQuery) score += 18;
  else if (projectType.includes(normalizedQuery)) score += 10;

  const keywordMatches = countTokenMatches(semantic.keywords.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const useCaseMatches = countTokenMatches(semantic.useCases.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const capabilityMatches = countTokenMatches(semantic.capabilities.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const tagMatches = countTokenMatches(semantic.tags.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const topicMatches = countTokenMatches(topics.join('\n').toLowerCase(), [normalizedQuery, ...tokens]);
  const summaryMatches = countTokenMatches(`${semantic.summary}\n${semantic.problemSolved}`.toLowerCase(), [normalizedQuery, ...tokens]);

  score += keywordMatches * 14;
  score += useCaseMatches * 18;
  score += capabilityMatches * 12;
  score += tagMatches * 16;
  score += topicMatches * 8;
  score += summaryMatches * 10;

  const broadText = [
    fullName,
    name,
    seoTitle,
    oneLineIntro,
    chineseIntro,
    description,
    seoDescription,
    projectType,
    semantic.keywords.join(' '),
    semantic.useCases.join(' '),
    semantic.capabilities.join(' '),
    semantic.summary,
    semantic.problemSolved,
    topics.join(' '),
  ]
    .filter(Boolean)
    .join('\n');

  if (tokens.length > 0 && includesAnyToken(broadText, tokens)) {
    score += tokens.length * 2;
  }

  score += Math.min(6, Math.log10(Math.max(10, project.stars)));
  return score;
}

function buildSearchWhere(options: {
  query?: string;
  language?: string;
  minStars?: number;
}) {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (options.query) {
    const searchTerm = `%${options.query}%`;
    conditions.push(`
      (
        p.full_name LIKE ?
        OR p.name LIKE ?
        OR p.description LIKE ?
        OR p.chinese_intro LIKE ?
        OR p.one_line_intro LIKE ?
        OR p.topics LIKE ?
        OR p.seo_title LIKE ?
        OR p.seo_description LIKE ?
        OR p.project_type LIKE ?
        OR pa.semantic_data LIKE ?
      )
    `);
    params.push(
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    );
  }

  if (options.language) {
    conditions.push('p.language = ?');
    params.push(options.language);
  }

  if ((options.minStars || 0) > 0) {
    conditions.push('p.stars >= ?');
    params.push(options.minStars || 0);
  }

  return { conditions, params };
}

export function searchProjects(options: SearchProjectsOptions) {
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
  const { conditions, params } = buildSearchWhere({ query, language, minStars });

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `
    SELECT COUNT(*) as count
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { count: number };

  if (query) {
    const rankSql = `
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
        pa.semantic_data
      FROM projects p
      LEFT JOIN project_analysis pa ON pa.project_id = p.id
      ${whereClause}
      ORDER BY p.stars DESC, p.synced_at DESC
      LIMIT 800
    `;

    const ranked = (db.prepare(rankSql).all(...params) as SearchProjectRow[])
      .map((project) => ({
        project,
        score: getSearchScore(project, query),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || right.project.stars - left.project.stars);

    const projects = ranked
      .slice(offset, offset + pageSize)
      .map((item) => item.project);

    return {
      projects,
      total: countResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.count / pageSize),
    };
  }

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
      pa.semantic_data
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
