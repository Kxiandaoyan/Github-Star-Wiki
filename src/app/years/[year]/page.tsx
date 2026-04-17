import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Compass,
  Flame,
  Medal,
  Rocket,
  Star,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ProjectCard } from '@/components/ProjectCard';
import { ClusterList, MonthlyBarChart, ShareList } from '@/components/YearReviewVisuals';
import { buildYearReview, listAvailableYears } from '@/lib/year-review';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

interface YearPageProps {
  params: Promise<{ year: string }>;
}

function parseYear(raw: string): number | null {
  const year = Number.parseInt(raw, 10);
  if (!Number.isFinite(year)) return null;
  if (year < 2008 || year > 2100) return null;
  return year;
}

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (!year) {
    return { title: '年度回顾页不存在', robots: { index: false, follow: false } };
  }
  const review = buildYearReview(year);
  const title = review.hasData
    ? `${year} 年 Star 回顾 · ${review.total} 个项目`
    : `${year} 年 Star 回顾`;
  const description = review.hasData
    ? `${year} 年你在 GitHub 上 Star 了 ${review.total} 个项目，主要分布在 ${review.clusterBuckets.slice(0, 3).map((c) => c.label).join(' · ')} 等方向，在 ${review.peakMonthLabel} 最为活跃。`
    : `${year} 年的 Star 回顾页面。`;

  return {
    title,
    description,
    alternates: { canonical: `/years/${year}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/years/${year}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: review.hasData
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function YearReviewPage({ params }: YearPageProps) {
  const { year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (!year) {
    notFound();
  }

  const review = buildYearReview(year);
  const availableYears = listAvailableYears();
  const yearIndex = availableYears.indexOf(year);
  const previousYear = yearIndex >= 0 && yearIndex < availableYears.length - 1 ? availableYears[yearIndex + 1] : null;
  const nextYear = yearIndex > 0 ? availableYears[yearIndex - 1] : null;

  const itemListJsonLd = review.hasData
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${year} 年 Star 项目回顾`,
        itemListElement: review.topProjects.slice(0, 20).map((project, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/projects/${project.id}`,
          name: project.full_name,
        })),
      }
    : null;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${year} 年 Star 回顾`,
    datePublished: `${year}-12-31`,
    dateModified: new Date().toISOString(),
    author: { '@type': 'Organization', name: 'Star Wiki' },
    url: `${SITE_URL}/years/${year}`,
  };

  return (
    <>
      {itemListJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <div id="top" className="min-h-screen">
        <SiteHeader
          breadcrumbs={[
            { label: '年度回顾', href: '/years' },
            { label: `${year} 年` },
          ]}
        />

        <main id="main-content" className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6">
          <section className="surface-panel relative overflow-hidden rounded-[2rem] p-8 md:p-12">
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Star Year in Review
              </div>
              <h1 className="mt-6 text-[72px] font-black leading-none tracking-[-0.06em] text-foreground md:text-[128px]">
                {year}
              </h1>
              {review.hasData ? (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
                  这一年你在 GitHub 上收藏了
                  <span className="mx-1.5 font-semibold text-foreground">{review.total}</span>
                  个项目，平均每月
                  <span className="mx-1.5 font-semibold text-foreground">{review.averagePerMonth}</span>
                  个；
                  最活跃的月份是
                  <span className="mx-1.5 font-semibold text-foreground">{review.peakMonthLabel}</span>
                  （{review.peakMonthCount} 次）
                  {review.busiestDay ? (
                    <>
                      ，其中
                      <span className="mx-1 font-semibold text-foreground">{review.busiestDay.label}</span>
                      一天就收藏了
                      <span className="mx-1 font-semibold text-foreground">{review.busiestDay.count}</span>
                      个项目。
                    </>
                  ) : '。'}
                </p>
              ) : (
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                  {year} 年还没有记录到 Star 的项目。
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-2">
                {previousYear ? (
                  <Link
                    href={`/years/${previousYear}`}
                    className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← {previousYear} 年
                  </Link>
                ) : null}
                <Link
                  href="/years"
                  className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  所有年份
                </Link>
                {nextYear ? (
                  <Link
                    href={`/years/${nextYear}`}
                    className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {nextYear} 年 →
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {review.hasData ? (
            <>
              <section className="mt-8 grid gap-4 md:grid-cols-4">
                <StatCard
                  icon={Star}
                  label="收藏数"
                  value={String(review.total)}
                  hint={`合计 ★ ${review.totalStars.toLocaleString('en-US')}`}
                  accent="text-amber-500"
                />
                <StatCard
                  icon={Flame}
                  label={`${review.peakMonthLabel}`}
                  value={`${review.peakMonthCount}`}
                  hint="最活跃月份"
                  accent="text-orange-500"
                />
                <StatCard
                  icon={Calendar}
                  label={review.busiestDay ? review.busiestDay.label : '—'}
                  value={review.busiestDay ? `${review.busiestDay.count}` : '—'}
                  hint="单日最多"
                  accent="text-rose-500"
                />
                <StatCard
                  icon={TrendingUp}
                  label={
                    review.growth === null
                      ? '新起点'
                      : review.growth > 0
                        ? `↑ ${Math.round(review.growth * 100)}%`
                        : `↓ ${Math.round(Math.abs(review.growth) * 100)}%`
                  }
                  value={review.previousTotal === null ? '—' : `vs ${review.previousTotal}`}
                  hint={review.previousTotal === null ? '无去年数据' : '对比去年'}
                  accent={review.growth && review.growth > 0 ? 'text-emerald-500' : 'text-sky-500'}
                />
              </section>

              <section className="mt-8 surface-panel rounded-[1.8rem] p-6 md:p-8">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">月度 Star 活动</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  按月统计当年的 Star 分布。高亮的那根是年度峰值。
                </p>
                <div className="mt-7">
                  <MonthlyBarChart buckets={review.monthlyBuckets} />
                </div>
              </section>

              <section className="mt-8 grid gap-6 md:grid-cols-2">
                {review.clusterBuckets.length > 0 ? (
                  <div className="surface-panel rounded-[1.8rem] p-6 md:p-7">
                    <div className="flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">主要方向</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      按语义聚类统计你这一年都在关注哪些领域。
                    </p>
                    <div className="mt-6">
                      <ClusterList items={review.clusterBuckets.slice(0, 8)} />
                    </div>
                  </div>
                ) : null}

                {review.languageBuckets.length > 0 ? (
                  <div className="surface-panel rounded-[1.8rem] p-6 md:p-7">
                    <div className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">编程语言</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      这一年收藏最多的前几门语言。
                    </p>
                    <div className="mt-6">
                      <ShareList
                        items={review.languageBuckets.map((item) => ({
                          label: item.name,
                          count: item.count,
                          share: item.share,
                        }))}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              {review.newCategoriesVsPrevious.length > 0 ? (
                <section className="mt-8 surface-panel rounded-[1.8rem] p-6 md:p-7">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">今年才开始关注的方向</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    这些领域去年还没有出现在你的收藏里，今年开始有 Star 落地。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {review.newCategoriesVsPrevious.map((item) => (
                      <Link
                        key={item.id}
                        href={`/collections/${item.id}`}
                        className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
                      >
                        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          +{item.count}
                        </span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {review.topicBuckets.length > 0 ? (
                <section className="mt-8 surface-panel rounded-[1.8rem] p-6 md:p-7">
                  <h2 className="text-xl font-semibold text-foreground">热门标签</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    这一年出现次数最多的 GitHub topics。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {review.topicBuckets.map((topic) => (
                      <span
                        key={topic.name}
                        className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-foreground"
                        style={{
                          fontSize: `${Math.min(16, 12 + Math.log2(topic.count + 1))}px`,
                        }}
                      >
                        {topic.name}
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {topic.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {review.topProjects.length > 0 ? (
                <section className="mt-8">
                  <div className="mb-5 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {year} 年收藏过的最受欢迎项目
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        按 stars 从高到低，看看你在这一年 Star 的重量级项目。
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {review.topProjects.map((project) => (
                      <ProjectCard key={project.id} {...project} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-10 surface-panel rounded-[1.8rem] p-6 text-sm leading-7 text-muted-foreground md:p-7">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-4 w-4 text-primary" />
                  <p>
                    想继续浏览？
                    <Link href="/graph" className="mx-1 text-foreground underline-offset-4 hover:underline">
                      /graph
                    </Link>
                    按语义关联看关系图谱；
                    <Link href="/collections" className="mx-1 text-foreground underline-offset-4 hover:underline">
                      /collections
                    </Link>
                    按主题重新整理你的收藏。
                  </p>
                </div>
              </section>
            </>
          ) : (
            <section className="mt-8 surface-panel rounded-[1.8rem] px-6 py-16 text-center text-sm text-muted-foreground md:p-12">
              <p className="text-lg text-foreground">{year} 年还没有 Star 记录。</p>
              <p className="mt-3">Star 记录需要通过同步功能拉取，可以在后台触发一次完整同步。</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link
                  href="/years"
                  className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
                >
                  看看其他年份
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          )}
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="surface-panel flex flex-col gap-3 rounded-[1.4rem] p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{hint}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold tracking-[-0.03em] text-foreground">{value}</span>
      </div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
