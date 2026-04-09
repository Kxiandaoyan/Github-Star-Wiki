import db from '@/lib/db';

interface CountRow {
  count: number;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 立即发送初始状态
      const sendUpdate = () => {
        try {
          const stats = {
            queue: {
              pending: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('pending') as CountRow | undefined)?.count || 0,
              processing: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('processing') as CountRow | undefined)?.count || 0,
              completed: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('completed') as CountRow | undefined)?.count || 0,
              failed: (db.prepare('SELECT COUNT(*) as count FROM task_queue WHERE status = ?').get('failed') as CountRow | undefined)?.count || 0,
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
