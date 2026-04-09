import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Hash } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getTopicBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '技术标签聚合页',
  description: '浏览站内按 GitHub topics 聚合的项目页面，快速查看 Next.js、Agent、Automation 等主题下的开源项目。',
  alternates: {
    canonical: '/topics',
  },
  openGraph: {
    title: '技术标签聚合页',
    description: '浏览站内按 GitHub topics 聚合的项目页面。',
    url: `${SITE_URL}/topics`,
  },
};

export default function TopicsIndexPage() {
  const topics = getTopicBuckets(180);

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
            <Hash className="h-4 w-4 text-primary" />
            Topics
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按技术标签浏览项目
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            这里把 GitHub topics 自动整理成可索引的专题入口页，适合从具体技术主题切入浏览项目。
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="surface-chip rounded-full px-4 py-3 text-sm text-foreground hover:text-primary"
            >
              {topic.name}
              <span className="ml-2 text-muted-foreground">{topic.count}</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
