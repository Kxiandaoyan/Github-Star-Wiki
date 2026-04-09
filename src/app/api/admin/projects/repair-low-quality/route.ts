import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { requireAdminApi } from '@/lib/admin-auth';
import db from '@/lib/db';
import { enqueueProjectAutoRepair } from '@/lib/project-auto-repair';

type SkipReason = 'quality_ok' | 'already_pending' | 'max_attempts_reached' | 'not_generated_yet' | 'project_not_found';

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminApi(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const projectIds = db.prepare(`
      SELECT id
      FROM projects
      WHERE intro_status = 'completed'
         OR wiki_status = 'completed'
         OR one_line_intro IS NOT NULL
         OR chinese_intro IS NOT NULL
      ORDER BY COALESCE(starred_at, synced_at, created_at) DESC
    `).all() as Array<{ id: number }>;

    let queued = 0;
    const skippedByReason: Record<SkipReason, number> = {
      quality_ok: 0,
      already_pending: 0,
      max_attempts_reached: 0,
      not_generated_yet: 0,
      project_not_found: 0,
    };

    projectIds.forEach((project) => {
      const result = enqueueProjectAutoRepair(project.id, 1);
      if (result.enqueued) {
        queued += 1;
        return;
      }

      skippedByReason[result.reason as SkipReason] += 1;
    });

    const detailMessage = [
      `已入队 ${queued} 个补全任务`,
      `质量已达标 ${skippedByReason.quality_ok} 个`,
      `队列中已有任务 ${skippedByReason.already_pending} 个`,
      `达到自动补全上限 ${skippedByReason.max_attempts_reached} 个`,
    ].join('，');

    return apiSuccess(
      {
        queued,
        skippedByReason,
        scanned: projectIds.length,
        detailMessage,
      },
      `已巡检 ${projectIds.length} 个项目。`
    );
  } catch (error) {
    return apiError(
      '低质量项目补全巡检失败。',
      500,
      'REPAIR_LOW_QUALITY_FAILED',
      error instanceof Error ? error.message : undefined
    );
  }
}
