import db from './db';
import {
  decideProjectContentRepair,
  evaluateProjectContentQuality,
  type ContentQualityResult,
} from './content-quality';
import { getProjectAnalysisArtifacts } from './project-analysis';
import { getNumberSetting } from './settings';
import {
  enqueueTask,
  hasActiveGenerateTask,
  type PipelineTaskType,
} from './task-queue';

interface ProjectRepairAuditRow {
  id: number;
  full_name: string;
  one_line_intro: string | null;
  chinese_intro: string | null;
  seo_title: string | null;
  seo_description: string | null;
  intro_status: string;
  wiki_status: string;
  mind_map: string | null;
  faq_json: string | null;
  project_type: string | null;
  auto_repair_count: number | null;
}

export interface ProjectRepairDecision {
  projectId: number;
  fullName: string;
  hasGeneratedContent: boolean;
  score: number;
  issues: string[];
  strengths: string[];
  triggerIssues: string[];
  needsRepair: boolean;
  hasActiveTask: boolean;
  autoRepairCount: number;
  maxAutoRepairCount: number;
  suggestedTaskType: PipelineTaskType | null;
}

export interface EnqueueAutoRepairResult {
  enqueued: boolean;
  reason:
    | 'project_not_found'
    | 'not_generated_yet'
    | 'already_pending'
    | 'quality_ok'
    | 'max_attempts_reached'
    | 'queued';
  projectId: number;
  fullName: string | null;
  score: number | null;
  issues: string[];
  taskType: PipelineTaskType | null;
}

function getProjectRepairAuditRow(projectId: number) {
  return db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.one_line_intro,
      p.chinese_intro,
      p.seo_title,
      p.seo_description,
      p.intro_status,
      p.wiki_status,
      p.mind_map,
      p.faq_json,
      p.project_type,
      p.auto_repair_count
    FROM projects p
    WHERE p.id = ?
  `).get(projectId) as ProjectRepairAuditRow | undefined;
}

function getWikiDocuments(projectId: number) {
  return db.prepare(`
    SELECT title, content
    FROM wiki_documents
    WHERE project_id = ?
    ORDER BY sort_order ASC
  `).all(projectId) as Array<{ title: string; content: string }>;
}

function buildQualityResult(row: ProjectRepairAuditRow): ContentQualityResult {
  const wikiDocuments = getWikiDocuments(row.id);
  return evaluateProjectContentQuality({
    projectName: row.full_name,
    oneLineIntro: row.one_line_intro,
    chineseIntro: row.chinese_intro,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    projectType: row.project_type,
    faqJson: row.faq_json,
    mindMap: row.mind_map,
    introStatus: row.intro_status,
    wikiStatus: row.wiki_status,
    wikiDocuments,
  });
}

export function getProjectRepairDecision(projectId: number): ProjectRepairDecision | null {
  const row = getProjectRepairAuditRow(projectId);
  if (!row) {
    return null;
  }

  const quality = buildQualityResult(row);
  const artifacts = getProjectAnalysisArtifacts(projectId);
  const maxAutoRepairCount = Math.max(0, getNumberSetting('AUTO_REPAIR_MAX_ATTEMPTS', 2));
  const autoRepairCount = row.auto_repair_count || 0;
  const repair = decideProjectContentRepair(quality, {
    hasDeepReadData: Boolean(artifacts.deepRead),
    minScore: getNumberSetting('AUTO_REPAIR_MIN_SCORE', 70),
  });

  return {
    projectId,
    fullName: row.full_name,
    hasGeneratedContent:
      row.intro_status === 'completed'
      || row.wiki_status === 'completed'
      || Boolean(row.one_line_intro?.trim())
      || Boolean(row.chinese_intro?.trim()),
    score: quality.score,
    issues: quality.issues,
    strengths: quality.strengths,
    triggerIssues: repair.triggerIssues,
    needsRepair: repair.needsRepair,
    hasActiveTask: hasActiveGenerateTask(projectId),
    autoRepairCount,
    maxAutoRepairCount,
    suggestedTaskType: repair.suggestedTaskType,
  };
}

export function markProjectAutoRepairState(projectId: number, updates: {
  autoRepairCount?: number;
}) {
  const fragments: string[] = [];
  const values: Array<number> = [];

  if (typeof updates.autoRepairCount === 'number') {
    fragments.push('auto_repair_count = ?');
    values.push(updates.autoRepairCount);
  }

  if (fragments.length === 0) {
    return;
  }

  db.prepare(`
    UPDATE projects
    SET ${fragments.join(', ')}
    WHERE id = ?
  `).run(...values, projectId);
}

export function enqueueProjectAutoRepair(projectId: number, priority = 1): EnqueueAutoRepairResult {
  const decision = getProjectRepairDecision(projectId);
  if (!decision) {
    return {
      enqueued: false,
      reason: 'project_not_found',
      projectId,
      fullName: null,
      score: null,
      issues: [],
      taskType: null,
    };
  }

  if (!decision.hasGeneratedContent) {
    return {
      enqueued: false,
      reason: 'not_generated_yet',
      projectId,
      fullName: decision.fullName,
      score: decision.score,
      issues: decision.issues,
      taskType: null,
    };
  }

  if (decision.hasActiveTask) {
    return {
      enqueued: false,
      reason: 'already_pending',
      projectId,
      fullName: decision.fullName,
      score: decision.score,
      issues: decision.issues,
      taskType: null,
    };
  }

  if (!decision.needsRepair || !decision.suggestedTaskType) {
    return {
      enqueued: false,
      reason: 'quality_ok',
      projectId,
      fullName: decision.fullName,
      score: decision.score,
      issues: decision.issues,
      taskType: null,
    };
  }

  if (decision.autoRepairCount >= decision.maxAutoRepairCount) {
    return {
      enqueued: false,
      reason: 'max_attempts_reached',
      projectId,
      fullName: decision.fullName,
      score: decision.score,
      issues: decision.issues,
      taskType: decision.suggestedTaskType,
    };
  }

  const enqueued = enqueueTask(projectId, decision.suggestedTaskType, priority);
  if (!enqueued) {
    return {
      enqueued: false,
      reason: 'already_pending',
      projectId,
      fullName: decision.fullName,
      score: decision.score,
      issues: decision.issues,
      taskType: decision.suggestedTaskType,
    };
  }

  db.prepare(`
    UPDATE projects
    SET one_line_status = 'pending',
        intro_status = 'pending',
        wiki_status = 'pending'
    WHERE id = ?
  `).run(projectId);

  markProjectAutoRepairState(projectId, {
    autoRepairCount: decision.autoRepairCount + 1,
  });

  return {
    enqueued: true,
    reason: 'queued',
    projectId,
    fullName: decision.fullName,
    score: decision.score,
    issues: decision.issues,
    taskType: decision.suggestedTaskType,
  };
}
