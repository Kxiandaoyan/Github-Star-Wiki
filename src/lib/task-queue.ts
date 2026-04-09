import db from './db';

interface GenerationProjectRow {
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  one_line_intro: string | null;
  chinese_intro: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq_json: string | null;
  project_type: string | null;
}

export const PIPELINE_TASK_TYPES = [
  'scan_repo',
  'analyze_repo',
  'deep_read_repo',
  'generate_profile',
] as const;

export type PipelineTaskType = typeof PIPELINE_TASK_TYPES[number];
export type EnqueueReason = 'queued' | 'already_pending' | 'already_generated';

export interface EnqueueGenerateTaskResult {
  enqueued: boolean;
  reason: EnqueueReason;
}

export function hasActiveGenerateTask(projectId: number) {
  const row = db.prepare(`
    SELECT id
    FROM task_queue
    WHERE project_id = ?
      AND task_type IN (${PIPELINE_TASK_TYPES.map(() => '?').join(', ')})
      AND status IN ('pending', 'processing')
    LIMIT 1
  `).get(projectId, ...PIPELINE_TASK_TYPES) as { id: number } | undefined;

  return Boolean(row);
}

export function hasGeneratedProjectContent(projectId: number) {
  const project = db.prepare(`
    SELECT
      one_line_status,
      intro_status,
      wiki_status,
      one_line_intro,
      chinese_intro,
      seo_title,
      seo_description,
      faq_json,
      project_type
    FROM projects
    WHERE id = ?
  `).get(projectId) as GenerationProjectRow | undefined;

  if (!project) {
    return false;
  }

  const hasCoreStatuses = project.one_line_status === 'completed'
    && project.intro_status === 'completed'
    && project.wiki_status === 'completed';
  const hasCoreContent = Boolean(project.one_line_intro && project.chinese_intro);
  const hasSeoContent = Boolean(project.seo_title && project.seo_description && project.faq_json && project.project_type);

  return hasCoreStatuses && hasCoreContent && hasSeoContent;
}

export function enqueueTask(projectId: number, taskType: PipelineTaskType, priority = 1) {
  const existing = db.prepare(`
    SELECT id
    FROM task_queue
    WHERE project_id = ?
      AND task_type = ?
      AND status IN ('pending', 'processing')
    LIMIT 1
  `).get(projectId, taskType) as { id: number } | undefined;

  if (existing) {
    return false;
  }

  db.prepare(`
    INSERT INTO task_queue (project_id, task_type, priority)
    VALUES (?, ?, ?)
  `).run(projectId, taskType, priority);

  return true;
}

export function enqueueGenerateTask(projectId: number, priority = 1): EnqueueGenerateTaskResult {
  if (hasActiveGenerateTask(projectId)) {
    return {
      enqueued: false,
      reason: 'already_pending',
    };
  }

  if (hasGeneratedProjectContent(projectId)) {
    return {
      enqueued: false,
      reason: 'already_generated',
    };
  }

  enqueueTask(projectId, 'scan_repo', priority);

  return {
    enqueued: true,
    reason: 'queued',
  };
}
