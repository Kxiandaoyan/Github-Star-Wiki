import { NextRequest, NextResponse } from 'next/server';
import { getProjects, getLanguages } from '@/lib/github';

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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
