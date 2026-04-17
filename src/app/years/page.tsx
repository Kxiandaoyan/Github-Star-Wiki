import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarRange } from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import db from '@/lib/db';
import { listAvailableYears } from '@/lib/year-review';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '年度 Star 回顾',
  description: '按年份浏览你的 GitHub Star 分布、主要方向、热门语言与峰值时刻，为每一年生成独立的回顾页。',
  alternates: { canonical: '/years' },
  openGraph: {
    title: '年度 Star 回顾 · Star Wiki',
    description: '按年份浏览你的 GitHub Star 分布。',
    url: `${SITE_URL}/years`,
  },
};

interface YearSummary {
  year: number;
  count: number;
  peakMonth: number | null;
  topLanguage: string | null;
}

function summarizeYears(years: number[]): YearSummary[] {
  return years.map((year) => {
    const startKey = `${year}-01-01`;
    const endKey = `${year + 1}-01-01`;
    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS count FROM projects
         WHERE starred_at IS NOT NULL AND starred_at >= ? AND starred_at < ?`
      )
      .get(startKey, endKey) as { count: number };

    const peakRow = db
      .prepare(
        `SELECT CAST(strftime('%m', starred_at) AS INTEGER) AS month, COUNT(*) AS count
         FROM projects
         WHERE starred_at IS NOT NULL AND starred_at >= ? AND starred_at < ?
         GROUP BY month
         ORDER BY count DESC
         LIMIT 1`
      )
      .get(startKey, endKey) as { month: number; count: number } | undefined;

    const langRow = db
      .prepare(
        `SELECT language, COUNT(*) AS count FROM projects
         WHERE starred_at IS NOT NULL AND starred_at >= ? AND starred_at < ?
           AND language IS NOT NULL
         GROUP BY language
         ORDER BY count DESC
         LIMIT 1`
      )
      .get(startKey, endKey) as { language: string; count: number } | undefined;

    return {
      year,
      count: countRow.count,
      peakMonth: peakRow?.month ?? null,
      topLanguage: langRow?.language ?? null,
    };
  });
}

export default function YearsIndexPage() {
  const years = listAvailableYears();
  const summaries = summarizeYears(years);
  const totalProjects = summaries.reduce((sum, item) => sum + item.count, 0);

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '年度回顾' }]} />

      <main id="main-content" className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5 text-primary" />
              Year in Review
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {years.length} 年 · {totalProjects} 个项目
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground md:text-5xl">
            按年份回看你的 Star
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            每一年都有独立的回顾页，展示你那一年的 Star 分布、主要方向、峰值月份和代表项目。
            很适合年底回看一年的兴趣轨迹，也是做个人年终总结的素材来源。
          </p>
        </section>

        {summaries.length > 0 ? (
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => (
              <Link
                key={summary.year}
                href={`/years/${summary.year}`}
                className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-6 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-5xl font-black tracking-[-0.04em] text-foreground group-hover:text-primary">
                    {summary.year}
                  </div>
                  <span className="surface-chip inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                    {summary.count}
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  这一年 Star 了 {summary.count} 个项目
                  {summary.topLanguage ? `，最多是 ${summary.topLanguage}` : ''}
                  {summary.peakMonth ? `，${summary.peakMonth} 月最活跃` : ''}
                  。
                </p>
                <div className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                  查看 {summary.year} 年回顾
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-8 surface-panel rounded-[1.6rem] px-6 py-12 text-center text-sm text-muted-foreground">
            <p className="text-foreground">还没有可回顾的年份。</p>
            <p className="mt-2">触发一次完整同步后，各年的 Star 数据会自动收录。</p>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
