export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 只在服务器端运行
    const { initApp } = await import('./src/lib/app');
    await initApp();
  }
}
