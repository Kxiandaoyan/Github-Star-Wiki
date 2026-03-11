import { NextRequest, NextResponse } from 'next/server';
import { syncStarredRepos } from '@/lib/github';

export async function POST(request: NextRequest) {
  try {
    const forceRefresh = ['1', 'true'].includes(request.nextUrl.searchParams.get('force') || '');
    const result = await syncStarredRepos({ forceRefresh });
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to trigger sync',
  });
}
