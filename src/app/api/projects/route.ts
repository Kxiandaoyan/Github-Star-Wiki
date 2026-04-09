import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getProjects } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const language = searchParams.get('lang') || undefined;
    const sortBy = (searchParams.get('sort') as 'stars' | 'synced_at') || 'synced_at';

    const result = getProjects({
      page,
      pageSize: 20,
      language,
      sortBy,
    });

    return apiSuccess(result, '已获取项目列表。');
  } catch (error) {
    console.error('Get projects error:', error);
    return apiError('获取项目列表失败。', 500, 'GET_PROJECTS_FAILED', error instanceof Error ? error.message : undefined);
  }
}
