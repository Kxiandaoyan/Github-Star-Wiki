import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { redirectIfAdminAuthenticated } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  await redirectIfAdminAuthenticated();
  const params = await searchParams;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 md:px-6">
        <Link
          href="/"
          className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-5xl items-center gap-8 px-4 pb-12 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Console
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            管理后台配置、提示词和项目内容更新
          </h1>
          <p className="max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
            登录后可以直接管理运行配置、模型提示词，并一键批量重写所有项目的介绍、用途、安装和使用信息。
          </p>
        </section>

        <AdminLoginForm reason={params.reason} />
      </main>
    </div>
  );
}
