import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getUseCaseBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '使用场景聚合页',
  description: '按 Agent 工作流、自动化、UI 构建、开发提效等使用场景聚合站内 GitHub Star 项目，帮助用户从真实任务场景重新发现开源仓库。',
  alternates: {
    canonical: '/use-cases',
  },
  openGraph: {
    title: '使用场景聚合页',
    description: '按真实使用场景聚合站内 GitHub Star 项目。',
    url: `${SITE_URL}/use-cases`,
  },
};

export default function UseCasesIndexPage() {
  const useCases = getUseCaseBuckets(100);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link
            href="/"
            className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" />
            Use Cases
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按使用场景浏览
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            这里按真实任务场景聚合项目，比按技术名词更接近用户的目标，例如做 Agent 工作流、做自动化、做 UI 搭建或提升开发效率。
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map((bucket) => (
            <Link
              key={bucket.slug}
              href={bucket.href}
              className="surface-panel rounded-[1.6rem] p-5 text-foreground hover:border-primary/30"
            >
              <div className="text-lg font-semibold">{bucket.title}</div>
              <div className="mt-2 text-sm leading-7 text-muted-foreground">{bucket.description}</div>
              <div className="mt-3 text-sm text-muted-foreground">{bucket.count} 个项目</div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
