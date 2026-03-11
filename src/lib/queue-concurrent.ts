import db from './db';
import { fetchRepositoryContext } from './github';
import { LLMClient } from './llm';
import { ErrorClassifier } from './error-handler';

export interface Task {
  id: number;
  project_id: number;
  task_type: 'generate_all' | 'wiki_doc';
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
}

function delayToSql(delayMs = 0) {
  const seconds = Math.max(0, Math.ceil(delayMs / 1000));
  return seconds === 0 ? 'CURRENT_TIMESTAMP' : `datetime('now', '+${seconds} seconds')`;
}

export class ConcurrentQueueProcessor {
  private isRunning = false;
  private concurrency: number;
  private workers: Promise<void>[] = [];

  constructor(concurrency = 3) {
    const parsedConcurrency = parseInt(process.env.TASK_CONCURRENCY || String(concurrency), 10);
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

      const apiKey = this.getAvailableApiKey();

      if (!apiKey) {
        this.releaseTask(task.id, 10000, '[NO_API_KEY] No available API key.');
        console.log(`[Worker ${workerId}] No available API key. Waiting...`);
        await this.sleep(2000);
        continue;
      }

      try {
        await this.processTask(task, apiKey);

        db.prepare(`
          UPDATE task_queue
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(task.id);

        console.log(`[Worker ${workerId}] Task #${task.id} completed.`);
      } catch (error) {
        const taskError = error instanceof Error ? error : new Error('Unknown queue task error');
        console.error(`[Worker ${workerId}] Task #${task.id} failed:`, taskError.message);
        await this.handleTaskFailure(task, taskError);
      }
    }

    console.log(`Worker ${workerId} stopped.`);
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
        SELECT id
        FROM task_queue
        WHERE status = 'pending'
          AND COALESCE(available_at, CURRENT_TIMESTAMP) <= CURRENT_TIMESTAMP
        ORDER BY priority ASC, available_at ASC, created_at ASC
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

  private async processTask(task: Task, apiKey: ApiKey) {
    const project = db.prepare(`
      SELECT id, full_name, description
      FROM projects
      WHERE id = ?
    `).get(task.project_id) as ProjectRecord | undefined;

    if (!project) {
      throw new Error(`Project ${task.project_id} not found.`);
    }

    const llmClient = new LLMClient({
      apiKey: apiKey.api_key,
      baseUrl: apiKey.base_url,
      model: apiKey.model,
    });

    if (task.task_type !== 'generate_all') {
      throw new Error(`Unsupported task type: ${task.task_type}`);
    }

    await this.generateAllContent(project, llmClient);
    this.updateApiKeyUsage(apiKey.id);
  }

  private async generateAllContent(project: ProjectRecord, llmClient: LLMClient) {
    const analysis = await fetchRepositoryContext(project.full_name);
    const { oneLineIntro, chineseIntro, wikiDocuments } = await llmClient.generateAllContent(
      project.full_name,
      project.description,
      analysis.readme,
      analysis.structure,
      analysis.facts
    );

    const saveResult = db.transaction(() => {
      db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(project.id);

      db.prepare(`
        UPDATE projects
        SET one_line_intro = ?,
            one_line_status = 'completed',
            chinese_intro = ?,
            intro_status = 'completed',
            wiki_status = 'completed'
        WHERE id = ?
      `).run(oneLineIntro, chineseIntro, project.id);

      if (wikiDocuments.length > 0) {
        const insertWiki = db.prepare(`
          INSERT INTO wiki_documents (project_id, title, content, sort_order)
          VALUES (?, ?, ?, ?)
        `);

        wikiDocuments.forEach((chapter, index) => {
          insertWiki.run(project.id, chapter.title, chapter.content, index + 1);
        });
      }
    });

    saveResult();
  }

  private async handleTaskFailure(task: Task, error: Error) {
    const errorType = ErrorClassifier.classify(error);
    const strategy = ErrorClassifier.getStrategy(errorType);
    const errorMessage = `[${errorType}] ${error.message}`;

    if (strategy.skipProject || !strategy.shouldRetry || task.retry_count >= (strategy.maxRetries || 3)) {
      db.prepare(`
        UPDATE task_queue
        SET status = 'failed',
            error_message = ?,
            completed_at = CURRENT_TIMESTAMP,
            started_at = NULL
        WHERE id = ?
      `).run(errorMessage, task.id);
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
