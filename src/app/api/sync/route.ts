import { apiError, apiSuccess } from '@/lib/api-response';
import { syncStarredRepos } from '@/lib/github';

export async function POST() {
  try {
    const result = await syncStarredRepos();
    return apiSuccess(
      result,
      `同步完成，新增 ${result.new} 个项目，更新 ${result.updated} 个项目，已入队 ${result.queued} 个生成任务。`
    );
  } catch (error) {
    console.error('Sync error:', error);
    return apiError('同步失败。', 500, 'SYNC_FAILED', error instanceof Error ? error.message : undefined);
  }
}

export async function GET() {
  return apiSuccess(null, '请使用 POST 方法触发同步。');
}
