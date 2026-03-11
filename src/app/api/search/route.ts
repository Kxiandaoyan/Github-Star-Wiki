import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface ProjectSearchRow {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  stars: number;
  language: string | null;
  topics: string | null;
  synced_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const language = searchParams.get('lang') || undefined;
    const minStars = parseInt(searchParams.get('minStars') || '0', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = 20;
    const sortBy = searchParams.get('sortBy') || 'synced_at';
    const order = (searchParams.get('order') || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (query) {
      const searchTerm = `%${query}%`;
      conditions.push(`
        (
          full_name LIKE ?
          OR name LIKE ?
          OR description LIKE ?
          OR chinese_intro LIKE ?
          OR one_line_intro LIKE ?
          OR topics LIKE ?
        )
      `);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (language) {
      conditions.push('language = ?');
      params.push(language);
    }

    if (minStars > 0) {
      conditions.push('stars >= ?');
      params.push(minStars);
    }

    let sql = 'SELECT * FROM projects';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const validSortFields = ['synced_at', 'stars', 'name', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'synced_at';
    const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortField} ${orderDirection} LIMIT ? OFFSET ?`;
    const projects = db.prepare(sql).all(...params, pageSize, offset) as ProjectSearchRow[];

    let countSql = 'SELECT COUNT(*) as count FROM projects';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = db.prepare(countSql).get(...params) as { count: number };

    return NextResponse.json({
      projects,
      total: countResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.count / pageSize),
    });
  } catch (error: unknown) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown search error' },
      { status: 500 }
    );
  }
}
