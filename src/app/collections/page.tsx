import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Layers3 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getSpecialCollectionBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '自动专题聚合页',
  description: '基于站内 GitHub Star 项目自动生成的专题聚合页，包括 AI Agent、Next.js、自动化工具与独立开发者工具等稳定 SEO 入口。',
  alternates: {
    canonical: '/collections',
  },
  openGraph: {
    title: '自动专题聚合页',
    description: '基于站内 GitHub Star 项目自动生成的专题聚合页。',
    url: `${SITE_URL}/collections`,
  },
};

export default function CollectionsIndexPage() {
  const collections = getSpecialCollectionBuckets(24);

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
            <Layers3 className="h-4 w-4 text-primary" />
            Collections
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            自动专题聚合页
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            这些页面不依赖人工写文章，而是根据站内项目的语言、标签、描述和用途特征自动聚合生成。它们既能提升 SEO，也能帮助用户从更高层的主题重新整理过去 Star 过的项目。
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={collection.href}
              className="surface-panel rounded-[1.8rem] p-6 text-foreground hover:border-primary/30"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{collection.title}</h2>
                <span className="surface-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                  {collection.count} 项目
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{collection.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
