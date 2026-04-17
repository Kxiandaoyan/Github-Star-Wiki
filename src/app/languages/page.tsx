import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getLanguageColor } from '@/lib/language-colors';
import { getLanguageBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '按编程语言浏览项目',
  description: '浏览站内按编程语言聚合的 GitHub Star 项目页面，适合从 TypeScript、Python、Go、Rust 等技术栈切入查找项目。',
  alternates: {
    canonical: '/languages',
  },
  openGraph: {
    title: '按编程语言浏览项目 · Star Wiki',
    description: '浏览站内按编程语言聚合的 GitHub Star 项目页面。',
    url: `${SITE_URL}/languages`,
  },
};

export default function LanguagesIndexPage() {
  const languages = getLanguageBuckets(100);
  const total = languages.reduce((sum, l) => sum + l.count, 0);

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '编程语言' }]} />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              Languages
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {languages.length} 个语言 · {total} 个项目
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按编程语言浏览项目
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            最轻量、最稳定的一类聚合页。每个语言页都会自动聚合同技术栈项目，适合用户和搜索引擎一起使用。
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {languages.map((language) => {
            const dot = getLanguageColor(language.name).dot;
            return (
              <Link
                key={language.slug}
                href={`/languages/${language.slug}`}
                className="surface-panel group flex items-center justify-between gap-4 rounded-[1.4rem] p-5 text-foreground transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${dot}`} />
                  <span className="text-base font-semibold group-hover:text-primary">
                    {language.name}
                  </span>
                </div>
                <span className="surface-chip rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                  {language.count}
                </span>
              </Link>
            );
          })}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
