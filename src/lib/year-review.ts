import { getCached } from './cache';
import db from './db';
import { parseTopics } from './taxonomy';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  resolveClusterId,
  SEMANTIC_CLUSTER_DEFINITIONS,
  type ProjectSemanticProfile,
} from './semantic-profile';
import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
} from './project-analysis';

export interface YearProjectListItem {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  project_type: string | null;
  starred_at: string;
  updated_at: string | null;
}

interface YearProjectRow extends YearProjectListItem {
  topics: string | null;
  semantic_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
}

export interface YearReview {
  year: number;
  total: number;
  totalStars: number;
  monthly: number[];
  peakMonthLabel: string;
  peakMonthCount: number;
  busiestDay: { date: string; count: number; label: string } | null;
  averagePerMonth: number;
  languageBuckets: Array<{ name: string; count: number; share: number }>;
  clusterBuckets: Array<{ id: string; label: string; color: string; count: number; share: number }>;
  topicBuckets: Array<{ name: string; count: number }>;
  topProjects: YearProjectListItem[];
  newCategoriesVsPrevious: Array<{ id: string; label: string; count: number }>;
  previousTotal: number | null;
  growth: number | null;
  hasData: boolean;
}

function parseJson<T>(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function monthIndexOf(dateString: string) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCMonth();
}

function computeMonthlyBreakdown(rows: YearProjectRow[]) {
  const monthly = Array(12).fill(0) as number[];
  rows.forEach((row) => {
    const index = monthIndexOf(row.starred_at);
    if (index !== null) monthly[index] += 1;
  });
  return monthly;
}

function computeBusiestDay(rows: YearProjectRow[]) {
  if (rows.length === 0) return null;
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const dateKey = row.starred_at.slice(0, 10);
    counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
  });
  let winner: { date: string; count: number } | null = null;
  counts.forEach((count, date) => {
    if (!winner || count > winner.count) winner = { date, count };
  });
  if (!winner) return null;
  const w = winner as { date: string; count: number };
  const parts = w.date.split('-');
  const label = parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : w.date;
  return { date: w.date, count: w.count, label };
}

const LANGUAGE_LIMIT = 8;
const TOPIC_LIMIT = 12;
const TOP_PROJECT_LIMIT = 10;

function aggregateLanguages(rows: YearProjectRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.language) return;
    counts.set(row.language, (counts.get(row.language) || 0) + 1);
  });
  const total = rows.length || 1;
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, LANGUAGE_LIMIT)
    .map(([name, count]) => ({
      name,
      count,
      share: count / total,
    }));
}

function aggregateTopics(rows: YearProjectRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    parseTopics(row.topics).forEach((topic) => {
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOPIC_LIMIT)
    .map(([name, count]) => ({ name, count }));
}

function aggregateClusters(rows: YearProjectRow[]) {
  const lookup = getSemanticClusterLookup();
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const profile = parseJson<ProjectSemanticProfile>(row.semantic_data)
      || deriveProjectSemanticProfile({
        projectName: row.full_name,
        description: row.description,
        projectType: row.project_type,
        topics: parseTopics(row.topics),
        oneLineIntro: row.one_line_intro,
        analysis: parseJson<RepositoryAnalysisResult>(row.analysis_data),
        deepRead: parseJson<RepositoryDeepReadResult>(row.deep_read_data),
      });
    const clusterId = resolveClusterId(profile.primaryCluster);
    counts.set(clusterId, (counts.get(clusterId) || 0) + 1);
  });

  const total = rows.length || 1;
  return SEMANTIC_CLUSTER_DEFINITIONS
    .map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      color: cluster.color,
      count: counts.get(cluster.id) || 0,
      share: (counts.get(cluster.id) || 0) / total,
    }))
    .filter((bucket) => bucket.count > 0)
    .sort((a, b) => b.count - a.count);
}

function fetchYearRows(year: number) {
  const startKey = `${year}-01-01`;
  const endKey = `${year + 1}-01-01`;
  return db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.stars,
      p.language,
      p.one_line_status,
      p.project_type,
      p.starred_at,
      p.updated_at,
      p.topics,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.starred_at IS NOT NULL
      AND p.starred_at >= ?
      AND p.starred_at < ?
    ORDER BY p.starred_at ASC
  `).all(startKey, endKey) as YearProjectRow[];
}

function countForYear(year: number) {
  const startKey = `${year}-01-01`;
  const endKey = `${year + 1}-01-01`;
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM projects
    WHERE starred_at IS NOT NULL
      AND starred_at >= ?
      AND starred_at < ?
  `).get(startKey, endKey) as { count: number };
  return row.count;
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function buildYearReview(year: number): YearReview {
  return getCached(`year-review:${year}`, 10 * 60_000, () => {
    const rows = fetchYearRows(year);
    const total = rows.length;
    const monthly = computeMonthlyBreakdown(rows);
    const peakIndex = monthly.reduce(
      (bestIdx, value, idx, arr) => (value > arr[bestIdx] ? idx : bestIdx),
      0
    );

    const languageBuckets = aggregateLanguages(rows);
    const clusterBuckets = aggregateClusters(rows);
    const topicBuckets = aggregateTopics(rows);
    const busiestDay = computeBusiestDay(rows);

    const topProjects = [...rows]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, TOP_PROJECT_LIMIT)
      .map(({ topics, semantic_data, analysis_data, deep_read_data, ...rest }) => {
        // 仅用于解构清理，不用到这些字段
        void topics; void semantic_data; void analysis_data; void deep_read_data;
        return rest;
      });

    const previousTotal = countForYear(year - 1);
    const growth = previousTotal > 0 ? (total - previousTotal) / previousTotal : null;

    const previousRows = previousTotal > 0 ? fetchYearRows(year - 1) : [];
    const previousClusterIds = new Set(
      aggregateClusters(previousRows).map((item) => item.id)
    );
    const newCategoriesVsPrevious = clusterBuckets
      .filter((item) => !previousClusterIds.has(item.id))
      .slice(0, 3);

    return {
      year,
      total,
      totalStars: rows.reduce((sum, row) => sum + (row.stars || 0), 0),
      monthly,
      peakMonthLabel: MONTH_LABELS[peakIndex],
      peakMonthCount: monthly[peakIndex],
      busiestDay,
      averagePerMonth: Math.round((total / 12) * 10) / 10,
      languageBuckets,
      clusterBuckets,
      topicBuckets,
      topProjects,
      newCategoriesVsPrevious,
      previousTotal: previousTotal > 0 ? previousTotal : null,
      growth,
      hasData: total > 0,
    };
  });
}

export function listAvailableYears(): number[] {
  const rows = db.prepare(`
    SELECT DISTINCT CAST(strftime('%Y', starred_at) AS INTEGER) AS year
    FROM projects
    WHERE starred_at IS NOT NULL
    ORDER BY year DESC
  `).all() as Array<{ year: number }>;
  return rows.map((r) => r.year).filter((y) => Number.isFinite(y) && y > 2000 && y < 2100);
}
