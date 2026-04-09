import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Code2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLanguageBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '编程语言聚合页',
  description: '浏览站内按编程语言聚合的 GitHub Star 项目页面，适合从 TypeScript、Python、Go 等技术栈切入查找项目。',
  alternates: {
    canonical: '/languages',
  },
  openGraph: {
    title: '编程语言聚合页',
    description: '浏览站内按编程语言聚合的 GitHub Star 项目页面。',
    url: `${SITE_URL}/languages`,
  },
};

export default function LanguagesIndexPage() {
  const languages = getLanguageBuckets(100);

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
            <Code2 className="h-4 w-4 text-primary" />
            Languages
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按编程语言浏览项目
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            这是最轻量、最稳定的一类 SEO 聚合页。每个语言页都会自动聚合同技术栈项目，适合用户和搜索引擎一起使用。
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {languages.map((language) => (
            <Link
              key={language.slug}
              href={`/languages/${language.slug}`}
              className="surface-panel rounded-[1.6rem] p-5 text-foreground hover:border-primary/30"
            >
              <div className="text-lg font-semibold">{language.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">{language.count} 个项目</div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
