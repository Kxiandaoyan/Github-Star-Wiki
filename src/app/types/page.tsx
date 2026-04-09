import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Boxes } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getProjectTypeBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '项目类型聚合页',
  description: '按应用、库、CLI、模板、文档等项目类型聚合站内 GitHub Star 项目，适合从项目形态角度重新整理收藏过的仓库。',
  alternates: {
    canonical: '/types',
  },
  openGraph: {
    title: '项目类型聚合页',
    description: '按应用、库、CLI、模板、文档等项目类型聚合站内 GitHub Star 项目。',
    url: `${SITE_URL}/types`,
  },
};

export default function ProjectTypesIndexPage() {
  const projectTypes = getProjectTypeBuckets(100);

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
            <Boxes className="h-4 w-4 text-primary" />
            项目类型
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按项目类型浏览
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            这里会按应用、库、CLI、模板、文档等形态聚合项目。它比单纯按语言分类更贴近“这个仓库到底是拿来干什么的”。
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projectTypes.map((bucket) => (
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
