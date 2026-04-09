import db from './db';
import { ErrorClassifier } from './error-handler';
import { fetchRepositoryFiles, fetchRepositoryScan } from './github';
import { GeneratedProjectResult, LLMClient } from './llm';
import {
  buildRepositoryEvidenceText,
  getProjectAnalysisArtifacts,
  saveProjectAnalysis,
  saveProjectDeepRead,
  saveProjectScan,
  saveProjectSemantic,
} from './project-analysis';
import { enqueueProjectAutoRepair } from './project-auto-repair';
import { deriveProjectSemanticProfile } from './semantic-profile';
import { createPipelinePromptSnapshot, getNumberSetting, getSettingValue } from './settings';
import {
  enqueueTask,
  hasGeneratedProjectContent,
  type PipelineTaskType,
} from './task-queue';

export interface Task {
  id: number;
  project_id: number;
  task_type: PipelineTaskType;
  priority: number;
  status: string;
  retry_count: number;
  error_message: string | null;
  available_at: string | null;
}

export interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  priority: number;
  is_active: boolean;
  daily_limit: number;
  daily_used: number;
  last_used_at: string | null;
}

interface ProjectRecord {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  topics: string | null;
  project_type: string | null;
}

type TaskProcessOutcome = 'completed' | 'skipped';

function delayToSql(delayMs = 0) {
  const seconds = Math.max(0, Math.ceil(delayMs / 1000));
  return seconds === 0 ? 'CURRENT_TIMESTAMP' : `datetime('now', '+${seconds} seconds')`;
}

function parseTopics(topics: string | null) {
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

function getFollowUpTaskPriority(currentPriority: number) {
  return Math.max(0, currentPriority - 1);
}

export class ConcurrentQueueProcessor {
  private isRunning = false;
  private concurrency: number;
  private workers: Promise<void>[] = [];

  constructor(concurrency = 3) {
    const parsedConcurrency = getNumberSetting('TASK_CONCURRENCY', concurrency);
    this.concurrency = Number.isFinite(parsedConcurrency) ? Math.max(1, parsedConcurrency) : 1;
    console.log(`Concurrent queue processor created with concurrency=${this.concurrency}`);
  }

  start() {
    if (this.isRunning) {
      console.log('Queue processor is already running.');
      return;
    }

    this.isRunning = true;
    this.recoverInterruptedTasks();

    for (let workerId = 0; workerId < this.concurrency; workerId += 1) {
      this.workers.push(this.startWorker(workerId));
    }
  }

  async stop() {
    this.isRunning = false;
    await Promise.all(this.workers);
    this.workers = [];
    console.log('Concurrent queue processor stopped.');
  }

  private async startWorker(workerId: number) {
    console.log(`Worker ${workerId} started.`);

    while (this.isRunning) {
      const task = this.claimNextTask();

      if (!task) {
        await this.sleep(1000);
        continue;
      }

      const taskLabel = `${task.task_type} project=${task.project_id} queueTask=${task.id}`;
      const apiKey = this.taskNeedsLlm(task.task_type) ? this.getAvailableApiKey() : null;
      const startedAt = Date.now();

      console.log(
        `[Worker ${workerId}] ${taskLabel} started${apiKey ? ` model=${this.getTaskModelName(task.task_type, apiKey)}` : ''}.`
      );

      if (this.taskNeedsLlm(task.task_type) && !apiKey) {
        this.releaseTask(task.id, 10000, '[NO_API_KEY] 当前没有可用的 API Key。');
        console.log(`[Worker ${workerId}] ${taskLabel} waiting for an available API key.`);
        await this.sleep(2000);
        continue;
      }

      try {
        const outcome = await this.processTask(task, apiKey);
        const durationMs = Date.now() - startedAt;
        const nextTaskSummary = this.getNextTaskSummary(task.project_id);

        if (outcome === 'skipped') {
          console.log(`[Worker ${workerId}] ${taskLabel} skipped in ${durationMs}ms.${nextTaskSummary ? ` next=${nextTaskSummary}` : ''}`);
          continue;
        }

        db.prepare(`
          UPDATE task_queue
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(task.id);

        console.log(`[Worker ${workerId}] ${taskLabel} completed in ${durationMs}ms.${nextTaskSummary ? ` next=${nextTaskSummary}` : ''}`);
      } catch (error) {
        const taskError = error instanceof Error ? error : new Error('Unknown queue task error');
        console.error(`[Worker ${workerId}] ${taskLabel} failed:`, taskError.message);
        await this.handleTaskFailure(task, taskError);
      }
    }

    console.log(`Worker ${workerId} stopped.`);
  }

  private taskNeedsLlm(taskType: Task['task_type']) {
    return taskType === 'analyze_repo'
      || taskType === 'deep_read_repo'
      || taskType === 'generate_profile';
  }

  private getTaskModelName(taskType: PipelineTaskType, apiKey: ApiKey) {
    const analysisModel = getSettingValue('MODEL_ANALYSIS_NAME').trim();
    return taskType === 'generate_profile' ? apiKey.model : (analysisModel || apiKey.model);
  }

  private getLlmClient(apiKey: ApiKey, taskType: PipelineTaskType) {
    const apiFormat = getSettingValue('MODEL_API_FORMAT').trim();

    return new LLMClient({
      apiKey: apiKey.api_key,
      baseUrl: apiKey.base_url,
      apiFormat,
      model: this.getTaskModelName(taskType, apiKey),
    });
  }

  private getNextTaskSummary(projectId: number) {
    const nextTask = db.prepare(`
      SELECT task_type, status, priority
      FROM task_queue
      WHERE project_id = ?
        AND status IN ('pending', 'processing')
      ORDER BY
        CASE status WHEN 'processing' THEN 0 ELSE 1 END,
        priority ASC,
        COALESCE(available_at, created_at) ASC,
        created_at ASC,
        id ASC
      LIMIT 1
    `).get(projectId) as { task_type: string; status: string; priority: number } | undefined;

    if (!nextTask) {
      return '';
    }

    return `${nextTask.task_type}/${nextTask.status}/p${nextTask.priority}`;
  }

  private recoverInterruptedTasks() {
    const interruptedProjectIds = db.prepare(`
      SELECT DISTINCT project_id
      FROM task_queue
      WHERE status = 'processing'
    `).all() as Array<{ project_id: number }>;

    const result = db.prepare(`
      UPDATE task_queue
      SET status = 'pending',
          retry_count = retry_count + 1,
          started_at = NULL,
          available_at = CURRENT_TIMESTAMP
      WHERE status = 'processing'
    `).run();

    if (interruptedProjectIds.length > 0) {
      const placeholders = interruptedProjectIds.map(() => '?').join(', ');
      db.prepare(`
        UPDATE projects
        SET one_line_status = CASE WHEN one_line_status = 'generating' THEN 'pending' ELSE one_line_status END,
            intro_status = CASE WHEN intro_status = 'generating' THEN 'pending' ELSE intro_status END,
            wiki_status = CASE WHEN wiki_status = 'generating' THEN 'pending' ELSE wiki_status END
        WHERE id IN (${placeholders})
      `).run(...interruptedProjectIds.map((item) => item.project_id));
    }

    if (result.changes > 0) {
      console.log(`Recovered ${result.changes} interrupted task(s).`);
    }
  }

  private claimNextTask() {
    const claim = db.transaction(() => {
      const nextTask = db.prepare(`
        SELECT pending_task.id
        FROM task_queue pending_task
        WHERE pending_task.status = 'pending'
          AND COALESCE(pending_task.available_at, CURRENT_TIMESTAMP) <= CURRENT_TIMESTAMP
          AND NOT EXISTS (
            SELECT 1
            FROM task_queue processing_task
            WHERE processing_task.project_id = pending_task.project_id
              AND processing_task.status = 'processing'
          )
        ORDER BY pending_task.priority ASC, pending_task.available_at ASC, pending_task.created_at ASC
        LIMIT 1
      `).get() as { id: number } | undefined;

      if (!nextTask) {
        return null;
      }

      const updated = db.prepare(`
        UPDATE task_queue
        SET status = 'processing',
            started_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND status = 'pending'
      `).run(nextTask.id);

      if (updated.changes === 0) {
        return null;
      }

      return db.prepare('SELECT * FROM task_queue WHERE id = ?').get(nextTask.id) as Task;
    });

    return claim();
  }

  private releaseTask(taskId: number, delayMs: number, errorMessage: string) {
    db.prepare(`
      UPDATE task_queue
      SET status = 'pending',
          started_at = NULL,
          error_message = ?,
          available_at = ${delayToSql(delayMs)}
      WHERE id = ?
    `).run(errorMessage, taskId);
  }

  private getAvailableApiKey() {
    return db.prepare(`
      SELECT * FROM api_keys
      WHERE is_active = 1 AND daily_used < daily_limit
      ORDER BY priority ASC, daily_used ASC
      LIMIT 1
    `).get() as ApiKey | null;
  }

  private updateApiKeyUsage(apiKeyId: number) {
    db.prepare(`
      UPDATE api_keys
      SET daily_used = daily_used + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(apiKeyId);
  }

  private markProjectGenerating(projectId: number) {
    db.prepare(`
      UPDATE projects
      SET one_line_status = CASE WHEN one_line_status = 'pending' THEN 'generating' ELSE one_line_status END,
          intro_status = CASE WHEN intro_status = 'pending' THEN 'generating' ELSE intro_status END,
          wiki_status = CASE WHEN wiki_status = 'pending' THEN 'generating' ELSE wiki_status END
      WHERE id = ?
    `).run(projectId);
  }

  private markTaskSkipped(taskId: number, projectId: number, reason: string) {
    db.prepare(`
      UPDATE task_queue
      SET status = 'skipped',
          error_message = ?,
          completed_at = CURRENT_TIMESTAMP,
          started_at = NULL
      WHERE id = ?
    `).run(reason, taskId);

    db.prepare(`
      UPDATE task_queue
      SET status = 'skipped',
          error_message = ?,
          completed_at = CURRENT_TIMESTAMP,
          started_at = NULL
      WHERE project_id = ?
        AND status IN ('pending', 'processing')
    `).run(reason, projectId);

    db.prepare(`
      UPDATE projects
      SET one_line_status = CASE WHEN one_line_status IN ('pending', 'generating') THEN 'skipped' ELSE one_line_status END,
          intro_status = CASE WHEN intro_status IN ('pending', 'generating') THEN 'skipped' ELSE intro_status END,
          wiki_status = CASE WHEN wiki_status IN ('pending', 'generating') THEN 'skipped' ELSE wiki_status END
      WHERE id = ?
    `).run(projectId);
  }

  private hasEnoughContext(project: ProjectRecord, analysis: { readme: string; structure: string; facts: string }) {
    return Boolean(
      project.description?.trim()
      || analysis.readme.trim()
      || analysis.structure.trim()
      || analysis.facts.trim()
    );
  }

  private async processTask(task: Task, apiKey: ApiKey | null): Promise<TaskProcessOutcome> {
    const project = db.prepare(`
      SELECT id, full_name, description, one_line_intro, chinese_intro, topics, project_type
      FROM projects
      WHERE id = ?
    `).get(task.project_id) as ProjectRecord | undefined;

    if (!project) {
      throw new Error(`Project ${task.project_id} not found.`);
    }

    if (task.task_type !== 'scan_repo' && hasGeneratedProjectContent(project.id)) {
      this.markTaskSkipped(task.id, project.id, '项目已有完整生成内容，跳过重复任务。');
      return 'skipped';
    }

    switch (task.task_type) {
      case 'scan_repo':
        return this.processScanTask(task, project);
      case 'analyze_repo':
        if (!apiKey) throw new Error('API key is required for analyze_repo');
        return this.processAnalyzeTask(task, project, apiKey);
      case 'deep_read_repo':
        if (!apiKey) throw new Error('API key is required for deep_read_repo');
        return this.processDeepReadTask(task, project, apiKey);
      case 'generate_profile':
        if (!apiKey) throw new Error('API key is required for generate_profile');
        return this.processGenerateTask(task, project, apiKey);
      default:
        throw new Error(`Unsupported task type: ${task.task_type}`);
    }
  }

  private async processScanTask(task: Task, project: ProjectRecord): Promise<TaskProcessOutcome> {
    const scan = await fetchRepositoryScan(project.full_name);
    scan.promptSnapshot = createPipelinePromptSnapshot();

    if (!this.hasEnoughContext(project, scan)) {
      this.markTaskSkipped(task.id, project.id, '仓库上下文信息不足，已跳过生成。');
      return 'skipped';
    }

    this.markProjectGenerating(project.id);
    saveProjectScan(project.id, scan);
    enqueueTask(project.id, 'analyze_repo', getFollowUpTaskPriority(task.priority));
    return 'completed';
  }

  private async processAnalyzeTask(task: Task, project: ProjectRecord, apiKey: ApiKey): Promise<TaskProcessOutcome> {
    const artifacts = getProjectAnalysisArtifacts(project.id);

    if (!artifacts.scan) {
      throw new Error(`Project ${project.id} scan data is missing.`);
    }

    const llmClient = this.getLlmClient(apiKey, 'analyze_repo');
    const analysis = await llmClient.analyzeRepository(project.full_name, project.description, artifacts.scan);
    saveProjectAnalysis(project.id, analysis);
    this.refreshSemanticProfile(project.id);
    this.updateApiKeyUsage(apiKey.id);

    const hasFilesToRead = (analysis.recommendedFiles.length > 0 || artifacts.scan.candidateFiles.length > 0);
    enqueueTask(
      project.id,
      hasFilesToRead ? 'deep_read_repo' : 'generate_profile',
      getFollowUpTaskPriority(task.priority)
    );

    return 'completed';
  }

  private async processDeepReadTask(task: Task, project: ProjectRecord, apiKey: ApiKey): Promise<TaskProcessOutcome> {
    const artifacts = getProjectAnalysisArtifacts(project.id);

    if (!artifacts.scan) {
      throw new Error(`Project ${project.id} scan data is missing.`);
    }

    const fileCandidates = [
      ...(artifacts.analysis?.recommendedFiles || []),
      ...artifacts.scan.candidateFiles,
      ...artifacts.scan.documentationFiles,
    ];
    const pinnedCommitSha = artifacts.scan.repositoryRef?.commitSha;

    const files = await fetchRepositoryFiles(project.full_name, fileCandidates, pinnedCommitSha);
    if (files.length === 0) {
      saveProjectDeepRead(project.id, {
        keyFileSummaries: [],
        architectureNotes: [],
        installEvidence: [],
        usageEvidence: [],
        moduleMap: [],
        reasoningSummary: '当前仓库没有读取到适合深读的关键文件内容。',
      });
      this.refreshSemanticProfile(project.id);
      enqueueTask(project.id, 'generate_profile', getFollowUpTaskPriority(task.priority));
      return 'completed';
    }

    const llmClient = this.getLlmClient(apiKey, 'deep_read_repo');
    const deepRead = await llmClient.deepReadRepository(
      project.full_name,
      project.description,
      artifacts.analysis || {
        projectType: 'unknown',
        summary: `${project.full_name} 是一个开源项目。`,
        problemSolved: '仓库中未明确给出完整的问题定义。',
        useCases: [],
        installGuide: [],
        usageGuide: [],
        mainModules: [],
        recommendedFiles: [],
        shouldGenerateMindMap: false,
        confidence: 'low',
      },
      files,
      artifacts.scan.promptSnapshot || null
    );

    saveProjectDeepRead(project.id, deepRead);
    this.refreshSemanticProfile(project.id);
    this.updateApiKeyUsage(apiKey.id);
    enqueueTask(project.id, 'generate_profile', getFollowUpTaskPriority(task.priority));

    return 'completed';
  }

  private async processGenerateTask(task: Task, project: ProjectRecord, apiKey: ApiKey): Promise<TaskProcessOutcome> {
    const artifacts = getProjectAnalysisArtifacts(project.id);

    if (!artifacts.scan) {
      throw new Error(`Project ${project.id} scan data is missing.`);
    }

    const llmClient = this.getLlmClient(apiKey, 'generate_profile');
    const repositoryAnalysis = artifacts.analysis ? JSON.stringify(artifacts.analysis, null, 2) : '';
    const repositoryEvidence = buildRepositoryEvidenceText(null, null, artifacts.deepRead)
      || buildRepositoryEvidenceText(artifacts.scan, null, null);
    const result = await llmClient.generateAllContent(
      project.full_name,
      project.description,
      artifacts.scan.readme,
      artifacts.scan.structure,
      artifacts.scan.facts,
      repositoryAnalysis,
      repositoryEvidence,
      artifacts.scan.promptSnapshot || null
    );

    this.saveGeneratedProject(project.id, result, task.priority);
    this.updateApiKeyUsage(apiKey.id);
    return 'completed';
  }

  private saveGeneratedProject(projectId: number, result: GeneratedProjectResult, priority: number) {
    const saveResult = db.transaction(() => {
      db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);

      db.prepare(`
        UPDATE projects
        SET one_line_intro = ?,
            one_line_status = 'completed',
            chinese_intro = ?,
            intro_status = 'completed',
            wiki_status = 'completed',
            mind_map = ?,
            seo_title = ?,
            seo_description = ?,
            faq_json = ?,
            project_type = ?
        WHERE id = ?
      `).run(
        result.oneLineIntro,
        result.chineseIntro,
        result.mindMap ? JSON.stringify(result.mindMap) : null,
        result.seoTitle,
        result.seoDescription,
        JSON.stringify(result.faqItems),
        result.projectType,
        projectId
      );

      if (result.wikiDocuments.length > 0) {
        const insertWiki = db.prepare(`
          INSERT INTO wiki_documents (project_id, title, content, sort_order)
          VALUES (?, ?, ?, ?)
        `);

        result.wikiDocuments.forEach((chapter, index) => {
          insertWiki.run(projectId, chapter.title, chapter.content, index + 1);
        });
      }
    });

    saveResult();
    this.refreshSemanticProfile(projectId);
    this.maybeEnqueueAutoRepair(projectId, priority);
  }

  private maybeEnqueueAutoRepair(projectId: number, priority: number) {
    const result = enqueueProjectAutoRepair(projectId, getFollowUpTaskPriority(priority));

    if (result.enqueued) {
      console.log(
        `[Auto Repair] queued project=${projectId} task=${result.taskType} score=${result.score ?? 'n/a'} issues=${result.issues.join(' | ')}`
      );
      return;
    }

    if (result.reason === 'quality_ok' || result.reason === 'not_generated_yet') {
      return;
    }

    console.log(
      `[Auto Repair] skipped project=${projectId} reason=${result.reason} score=${result.score ?? 'n/a'} issues=${result.issues.join(' | ')}`
    );
  }

  private refreshSemanticProfile(projectId: number) {
    const project = db.prepare(`
      SELECT id, full_name, description, one_line_intro, chinese_intro, topics, project_type
      FROM projects
      WHERE id = ?
    `).get(projectId) as ProjectRecord | undefined;

    if (!project) {
      return;
    }

    const artifacts = getProjectAnalysisArtifacts(projectId);
    const semanticProfile = deriveProjectSemanticProfile({
      projectName: project.full_name,
      description: project.description,
      projectType: project.project_type,
      topics: parseTopics(project.topics),
      oneLineIntro: project.one_line_intro,
      chineseIntro: project.chinese_intro,
      analysis: artifacts.analysis,
      deepRead: artifacts.deepRead,
    });

    saveProjectSemantic(projectId, semanticProfile);
  }

  private async handleTaskFailure(task: Task, error: Error) {
    const errorType = ErrorClassifier.classify(error);
    const strategy = ErrorClassifier.getStrategy(errorType);
    const errorMessage = `[${errorType}] ${error.message}`;
    const configuredMaxRetryCount = getNumberSetting('MAX_RETRY_COUNT', strategy.maxRetries || 3);
    const effectiveMaxRetries = Math.min(strategy.maxRetries || configuredMaxRetryCount, configuredMaxRetryCount);

    if (strategy.skipProject || !strategy.shouldRetry || task.retry_count >= effectiveMaxRetries) {
      const terminalStatus = strategy.skipProject ? 'skipped' : 'failed';
      db.prepare(`
        UPDATE task_queue
        SET status = ?,
            error_message = ?,
            completed_at = CURRENT_TIMESTAMP,
            started_at = NULL
        WHERE id = ?
      `).run(terminalStatus, errorMessage, task.id);

      db.prepare(`
        UPDATE projects
        SET one_line_status = CASE WHEN one_line_status = 'generating' THEN ? ELSE one_line_status END,
            intro_status = CASE WHEN intro_status = 'generating' THEN ? ELSE intro_status END,
            wiki_status = CASE WHEN wiki_status = 'generating' THEN ? ELSE wiki_status END
        WHERE id = ?
      `).run(terminalStatus, terminalStatus, terminalStatus, task.project_id);
      return;
    }

    db.prepare(`
      UPDATE task_queue
      SET status = 'pending',
          retry_count = retry_count + 1,
          priority = priority + ?,
          error_message = ?,
          started_at = NULL,
          available_at = ${delayToSql(strategy.delay)}
      WHERE id = ?
    `).run(strategy.priorityAdjust || 0, errorMessage, task.id);

    db.prepare(`
      UPDATE projects
      SET one_line_status = CASE WHEN one_line_status = 'generating' THEN 'pending' ELSE one_line_status END,
          intro_status = CASE WHEN intro_status = 'generating' THEN 'pending' ELSE intro_status END,
          wiki_status = CASE WHEN wiki_status = 'generating' THEN 'pending' ELSE wiki_status END
      WHERE id = ?
    `).run(task.project_id);
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

let processorInstance: ConcurrentQueueProcessor | null = null;

export function getConcurrentQueueProcessor() {
  if (!processorInstance) {
    processorInstance = new ConcurrentQueueProcessor();
  }

  return processorInstance;
}
