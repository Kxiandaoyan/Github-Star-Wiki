import { NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 立即发送初始状态
      const sendUpdate = () => {
        try {
          const stats = {
            queue: {
              pending: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('pending') as any)?.count || 0,
              processing: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('processing') as any)?.count || 0,
              completed: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('completed') as any)?.count || 0,
              failed: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('failed') as any)?.count || 0,
            },
            timestamp: new Date().toISOString(),
          };

          const data = `data: ${JSON.stringify(stats)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('SSE error:', error);
        }
      };

      // 发送初始数据
      sendUpdate();

      // 每5秒发送一次更新
      const interval = setInterval(sendUpdate, 5000);

      // 60秒后关闭连接
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 60000);

      // 清理函数
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
