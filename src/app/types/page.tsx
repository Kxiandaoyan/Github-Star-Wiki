import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Boxes } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getProjectTypeBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '按项目类型浏览',
  description: '按应用、库、CLI、模板、文档等项目类型聚合站内 GitHub Star 项目，适合从项目形态角度重新整理收藏过的仓库。',
  alternates: {
    canonical: '/types',
  },
  openGraph: {
    title: '按项目类型浏览 · Star Wiki',
    description: '按应用、库、CLI、模板、文档等项目类型聚合 GitHub Star 项目。',
    url: `${SITE_URL}/types`,
  },
};

export default function ProjectTypesIndexPage() {
  const projectTypes = getProjectTypeBuckets(100);
  const total = projectTypes.reduce((sum, t) => sum + t.count, 0);

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '项目类型' }]} />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5 text-primary" />
              项目类型
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {projectTypes.length} 种类型 · {total} 个项目
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按项目类型浏览
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            按应用、库、CLI、模板、文档等形态聚合项目。它比单纯按语言分类更贴近"这个仓库到底是拿来干什么的"。
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projectTypes.map((bucket) => (
            <Link
              key={bucket.slug}
              href={bucket.href}
              className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-5 text-foreground transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold leading-6 group-hover:text-primary">
                  {bucket.title}
                </h2>
                <span className="surface-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                  {bucket.count}
                </span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                {bucket.description}
              </p>
              <div className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                查看全部
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
