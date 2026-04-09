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

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return apiError('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    }

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
            project_type = NULL,
            auto_repair_count = 0
        WHERE id = ?
      `).run(projectId);

    db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_analysis WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM task_queue WHERE project_id = ?').run(projectId);
    enqueueGenerateTask(projectId, 0);

    return apiSuccess({ projectId }, '已创建重新生成任务，并提升为高优先级。');
  } catch (error) {
    console.error('Regenerate error:', error);
    return apiError('重新生成项目失败。', 500, 'REGENERATE_PROJECT_FAILED', error instanceof Error ? error.message : undefined);
  }
}
