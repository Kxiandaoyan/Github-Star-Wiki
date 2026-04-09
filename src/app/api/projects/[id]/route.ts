import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import db from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = Number.parseInt(paramId, 10);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    if (!project) {
      return apiError('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    }

    const wikiDocs = db
      .prepare('SELECT * FROM wiki_documents WHERE project_id = ? ORDER BY sort_order')
      .all(id);

    return apiSuccess({ project, wikiDocuments: wikiDocs }, '已获取项目详情。');
  } catch (error) {
    console.error('Get project error:', error);
    return apiError('获取项目详情失败。', 500, 'GET_PROJECT_FAILED', error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const projectId = Number.parseInt(paramId, 10);
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

    return apiSuccess(null, '项目内容已更新。');
  } catch (error) {
    console.error('Update project error:', error);
    return apiError('更新项目失败。', 500, 'UPDATE_PROJECT_FAILED', error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const projectId = Number.parseInt(paramId, 10);

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    db.prepare('DELETE FROM task_queue WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_analysis WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);

    return apiSuccess(null, '项目已删除。');
  } catch (error) {
    console.error('Delete project error:', error);
    return apiError('删除项目失败。', 500, 'DELETE_PROJECT_FAILED', error instanceof Error ? error.message : undefined);
  }
}
