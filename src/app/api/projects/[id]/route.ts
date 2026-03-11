import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    // 获取项目信息
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 获取 Wiki 文档
    const wikiDocs = db
      .prepare('SELECT * FROM wiki_documents WHERE project_id = ? ORDER BY sort_order')
      .all(id);

    return NextResponse.json({
      project,
      wikiDocuments: wikiDocs,
    });
  } catch (error: any) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const projectId = parseInt(paramId);
    const body = await request.json();

    const { one_line_intro, chinese_intro } = body;

    db.prepare(`
      UPDATE projects
      SET one_line_intro = COALESCE(?, one_line_intro),
          chinese_intro = COALESCE(?, chinese_intro),
          one_line_status = CASE WHEN ? IS NOT NULL THEN 'completed' ELSE one_line_status END,
          intro_status = CASE WHEN ? IS NOT NULL THEN 'completed' ELSE intro_status END
      WHERE id = ?
    `).run(one_line_intro, chinese_intro, one_line_intro, chinese_intro, projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const projectId = parseInt(paramId);

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    db.prepare('DELETE FROM task_queue WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
