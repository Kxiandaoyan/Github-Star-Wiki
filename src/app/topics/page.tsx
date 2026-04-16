import type { Metadata } from 'next';
import Link from 'next/link';
import { Hash } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getTopicBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '按技术标签浏览项目',
  description: '浏览站内按 GitHub topics 聚合的项目页面，快速查看 Next.js、Agent、Automation、MCP 等主题下的开源项目。',
  alternates: {
    canonical: '/topics',
  },
  openGraph: {
    title: '按技术标签浏览项目 · Star Wiki',
    description: '浏览站内按 GitHub topics 聚合的项目页面。',
    url: `${SITE_URL}/topics`,
  },
};

export default function TopicsIndexPage() {
  const topics = getTopicBuckets(180);
  const total = topics.reduce((sum, t) => sum + t.count, 0);

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '技术标签' }]} />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Hash className="h-3.5 w-3.5 text-primary" />
              Topics
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {topics.length} 个标签 · {total} 次出现
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按技术标签浏览项目
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            这里把 GitHub topics 自动整理成可索引的专题入口页，适合从具体技术主题切入浏览项目。
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="surface-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-foreground transition-colors hover:text-primary"
            >
              <Hash className="h-3 w-3 text-muted-foreground/70" />
              {topic.name}
              <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {topic.count}
              </span>
            </Link>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
