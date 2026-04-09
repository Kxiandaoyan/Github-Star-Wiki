import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { searchProjects } from '@/lib/project-search';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const language = searchParams.get('lang') || undefined;
    const minStars = parseInt(searchParams.get('minStars') || '0', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sortByParam = searchParams.get('sortBy');
    const order = (searchParams.get('order') || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    const result = searchProjects({
      query,
      language,
      minStars,
      page,
      pageSize: 20,
      sortBy: (sortByParam as 'relevance' | 'synced_at' | 'stars' | 'name' | 'created_at' | null) || (query ? 'relevance' : 'synced_at'),
      order,
    });

    return apiSuccess(result, '搜索完成。');
  } catch (error: unknown) {
    console.error('Search error:', error);
    return apiError('搜索失败。', 500, 'SEARCH_FAILED', error instanceof Error ? error.message : undefined);
  }
}
