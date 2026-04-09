import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';
import { requireAdminApi } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const transaction = db.transaction(() => {
      const projectRows = db.prepare('SELECT id FROM projects').all() as Array<{ id: number }>;

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
      `).run();

      db.prepare('DELETE FROM wiki_documents').run();
      db.prepare('DELETE FROM project_analysis').run();
      db.prepare('DELETE FROM task_queue').run();

      const insertTask = db.prepare(`
        INSERT INTO task_queue (project_id, task_type, priority)
        VALUES (?, 'scan_repo', 0)
      `);

      projectRows.forEach((project) => {
        insertTask.run(project.id);
      });

      return projectRows.length;
    });

    const queued = transaction();

    return apiSuccess(
      { queued },
      `已重新排队 ${queued} 个项目的内容更新任务。`
    );
  } catch (error) {
    return apiError('批量重写入队失败。', 500, 'REGENERATE_ALL_FAILED', error instanceof Error ? error.message : undefined);
  }
}
