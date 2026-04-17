import db from './db';
import { parseTopics } from './taxonomy';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  resolveClusterId,
  type ProjectSemanticProfile,
} from './semantic-profile';
import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
} from './project-analysis';

export interface CompareProjectRow {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  stars: number;
  language: string | null;
  topics: string | null;
  html_url: string;
  homepage: string | null;
  project_type: string | null;
  updated_at: string | null;
  starred_at: string | null;
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  semantic_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
}

export interface CompareProject {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro_excerpt: string;
  stars: number;
  language: string | null;
  topics: string[];
  html_url: string;
  homepage: string | null;
  project_type: string | null;
  project_type_label: string;
  updated_at: string | null;
  starred_at: string | null;
  is_complete: boolean;
  cluster: { id: string; label: string; color: string } | null;
  use_cases: string[];
  capabilities: string[];
  keywords: string[];
  problem_solved: string;
  first_wiki_excerpt: string | null;
  wiki_titles: string[];
}

const PROJECT_TYPE_LABEL: Record<string, string> = {
  app: '应用',
  library: '库 / SDK',
  cli: 'CLI 工具',
  plugin: '插件',
  ui: 'UI 组件库',
  template: '模板',
  docs: '文档项目',
  'awesome-list': '资源合集',
  content: '内容项目',
  config: '配置项目',
  unknown: '项目',
};

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toExcerpt(value: string | null | undefined, limit: number): string {
  if (!value) return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= limit) return trimmed;
  return trimmed.slice(0, limit - 1) + '…';
}

function loadSingleWikiExcerpt(projectId: number): string | null {
  const row = db
    .prepare(
      `SELECT content FROM wiki_documents
       WHERE project_id = ?
       ORDER BY sort_order ASC, id ASC
       LIMIT 1`
    )
    .get(projectId) as { content: string | null } | undefined;
  if (!row?.content) return null;
  return toExcerpt(row.content, 220);
}

function loadWikiTitles(projectId: number): string[] {
  const rows = db
    .prepare(
      `SELECT title FROM wiki_documents
       WHERE project_id = ?
       ORDER BY sort_order ASC, id ASC
       LIMIT 6`
    )
    .all(projectId) as Array<{ title: string }>;
  return rows.map((r) => r.title).filter(Boolean);
}

export function loadCompareProjects(ids: number[]): CompareProject[] {
  if (ids.length === 0) return [];
  const uniqueIds = Array.from(new Set(ids)).slice(0, 4);
  const placeholders = uniqueIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT p.id, p.full_name, p.name, p.description, p.one_line_intro,
              p.chinese_intro, p.stars, p.language, p.topics, p.html_url,
              p.homepage, p.project_type, p.updated_at, p.starred_at,
              p.one_line_status, p.intro_status, p.wiki_status,
              pa.semantic_data, pa.analysis_data, pa.deep_read_data
       FROM projects p
       LEFT JOIN project_analysis pa ON pa.project_id = p.id
       WHERE p.id IN (${placeholders})`
    )
    .all(...uniqueIds) as CompareProjectRow[];

  const byId = new Map(rows.map((row) => [row.id, row]));
  const clusterLookup = getSemanticClusterLookup();

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((row): row is CompareProjectRow => Boolean(row))
    .map((row) => {
      const topics = parseTopics(row.topics);
      const profile =
        parseJson<ProjectSemanticProfile>(row.semantic_data) ||
        deriveProjectSemanticProfile({
          projectName: row.full_name,
          description: row.description,
          projectType: row.project_type,
          topics,
          oneLineIntro: row.one_line_intro,
          chineseIntro: row.chinese_intro,
          analysis: parseJson<RepositoryAnalysisResult>(row.analysis_data),
          deepRead: parseJson<RepositoryDeepReadResult>(row.deep_read_data),
        });

      const clusterId = resolveClusterId(profile.primaryCluster);
      const cluster = clusterLookup.get(clusterId);

      const projectTypeKey = row.project_type || 'unknown';

      return {
        id: row.id,
        full_name: row.full_name,
        name: row.name,
        description: row.description,
        one_line_intro: row.one_line_intro,
        chinese_intro_excerpt: toExcerpt(row.chinese_intro, 240),
        stars: row.stars,
        language: row.language,
        topics: topics.slice(0, 6),
        html_url: row.html_url,
        homepage: row.homepage,
        project_type: row.project_type,
        project_type_label: PROJECT_TYPE_LABEL[projectTypeKey] || projectTypeKey,
        updated_at: row.updated_at,
        starred_at: row.starred_at,
        is_complete:
          row.one_line_status === 'completed' &&
          row.intro_status === 'completed' &&
          row.wiki_status === 'completed',
        cluster: cluster
          ? { id: cluster.id, label: cluster.label, color: cluster.color }
          : null,
        use_cases: profile.useCases.slice(0, 5),
        capabilities: profile.capabilities.slice(0, 5),
        keywords: profile.keywords.slice(0, 8),
        problem_solved: toExcerpt(profile.problemSolved, 180),
        first_wiki_excerpt: loadSingleWikiExcerpt(row.id),
        wiki_titles: loadWikiTitles(row.id),
      };
    });
}
