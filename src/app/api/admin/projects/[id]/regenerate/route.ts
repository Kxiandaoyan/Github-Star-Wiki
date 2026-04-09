import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';
import { enqueueGenerateTask } from '@/lib/task-queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { id } = await params;
    const projectId = Number.parseInt(id, 10);

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId) as { id: number } | undefined;
    if (!project) {
      return apiError('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE projects
        SET one_line_status = 'pending',
            intro_status = 'pending',
            wiki_status = 'pending',
            one_line_intro = NULL,
            chinese_intro = NULL,
            mind_map = NULL,
            seo_title = NULL,
            seo_description = NULL,
            faq_json = NULL,
            project_type = NULL
        WHERE id = ?
      `).run(projectId);

      db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM project_analysis WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM task_queue WHERE project_id = ?').run(projectId);
      enqueueGenerateTask(projectId, 0);
    });

    transaction();

    return apiSuccess({ projectId }, '项目已重新进入内容生成队列。');
  } catch (error) {
    return apiError('项目重写入队失败。', 500, 'REGENERATE_PROJECT_FAILED', error instanceof Error ? error.message : undefined);
  }
}
