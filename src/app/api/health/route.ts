import { apiError, apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';

interface CountRow {
  count: number;
}

interface RecentErrorRow {
  task_type: string;
  error_message: string | null;
  created_at: string;
}

interface CurrentTaskRow {
  id: number;
  project_id: number;
  task_type: string;
  started_at: string | null;
  full_name: string;
}

function count(sql: string, ...params: Array<string | number>) {
  return (db.prepare(sql).get(...params) as CountRow | undefined)?.count || 0;
}

export async function GET() {
  try {
    const queueStats = {
      pending: count('SELECT COUNT(*) as count FROM task_queue WHERE status = ?', 'pending'),
      processing: count('SELECT COUNT(*) as count FROM task_queue WHERE status = ?', 'processing'),
      completed: count('SELECT COUNT(*) as count FROM task_queue WHERE status = ?', 'completed'),
      failed: count('SELECT COUNT(*) as count FROM task_queue WHERE status = ?', 'failed'),
      skipped: count('SELECT COUNT(*) as count FROM task_queue WHERE status = ?', 'skipped'),
    };

    const projectStats = {
      total: count('SELECT COUNT(*) as count FROM projects'),
      withIntro: count('SELECT COUNT(*) as count FROM projects WHERE intro_status = ?', 'completed'),
      withWiki: count('SELECT COUNT(*) as count FROM projects WHERE wiki_status = ?', 'completed'),
    };

    const apiKeyStats = {
      total: count('SELECT COUNT(*) as count FROM api_keys'),
      active: count('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1'),
      available: count('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1 AND daily_used < daily_limit'),
    };

    const recentErrors = db.prepare(`
      SELECT task_type, error_message, created_at
      FROM task_queue
      WHERE status = 'failed' AND created_at > datetime('now', '-2 hour')
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as RecentErrorRow[];

    const currentTask = db.prepare(`
      SELECT tq.id, tq.project_id, tq.task_type, tq.started_at, p.full_name
      FROM task_queue tq
      JOIN projects p ON p.id = tq.project_id
      WHERE tq.status = 'processing'
      ORDER BY tq.started_at ASC
      LIMIT 1
    `).get() as CurrentTaskRow | undefined;

    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      queue: queueStats,
      projects: projectStats,
      apiKeys: apiKeyStats,
      currentTask: currentTask || null,
      recentErrors,
      timestamp: new Date().toISOString(),
    };

    if (apiKeyStats.available === 0) {
      health.status = 'degraded';
    }

    const totalTasks = queueStats.completed + queueStats.failed;
    if (totalTasks > 10 && queueStats.failed / totalTasks > 0.5) {
      health.status = 'unhealthy';
    }

    return apiSuccess(health, '已获取系统健康状态。');
  } catch (error) {
    return apiError(
      '获取系统健康状态失败。',
      500,
      'HEALTH_CHECK_FAILED',
      {
        detail: error instanceof Error ? error.message : undefined,
        timestamp: new Date().toISOString(),
      }
    );
  }
}
