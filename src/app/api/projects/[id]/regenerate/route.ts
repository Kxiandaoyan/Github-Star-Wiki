import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 重置项目状态
    db.prepare(`
      UPDATE projects
      SET one_line_status = 'pending',
          intro_status = 'pending',
          wiki_status = 'pending',
          one_line_intro = NULL,
          chinese_intro = NULL
      WHERE id = ?
    `).run(projectId);

    // 删除旧的 Wiki 文档
    db.prepare('DELETE FROM wiki_documents WHERE project_id = ?').run(projectId);

    // 删除旧任务
    db.prepare('DELETE FROM task_queue WHERE project_id = ? AND status = "pending"').run(projectId);

    // 创建新任务（高优先级）
    db.prepare(`
      INSERT INTO task_queue (project_id, task_type, priority)
      VALUES (?, 'generate_all', 0)
    `).run(projectId);

    return NextResponse.json({
      success: true,
      message: '重新生成任务已创建（高优先级）'
    });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
