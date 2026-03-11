import Link from 'next/link';
import Script from 'next/script';
import type { Metadata } from 'next';
import { ArrowRight, ExternalLink, Heart, SearchCode, Star, Users } from 'lucide-react';
import { BackgroundParticles } from '@/components/BackgroundParticles';
import { HeroCodeBackdrop } from '@/components/HeroCodeBackdrop';
import { LanguageFilter } from '@/components/LanguageFilter';
import { ProjectCard } from '@/components/ProjectCard';
import { SearchBar } from '@/components/SearchBar';
import { StarActivityGrid } from '@/components/StarActivityGrid';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchGitHubProfile, getLanguages, getProjects } from '@/lib/github';
import db from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const HOME_PAGE_SIZE = 21;
const ACTIVITY_WEEKS = 24;

export const metadata: Metadata = {
  title: 'GitHub Star 项目搜索与知识卡片',
  description: '整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 简介与 Wiki 卡片浏览。',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Star Wiki',
    description: '整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 简介与 Wiki 卡片浏览。',
    type: 'website',
    url: '/',
  },
};

interface ProjectRow {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
}

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    lang?: string;
    page?: string;
  }>;
}

interface ActivityPoint {
  date: string;
  count: number;
}

function searchProjects(options: {
  query?: string;
  language?: string;
  page?: number;
  pageSize?: number;
}) {
  const { query, language, page = 1, pageSize = HOME_PAGE_SIZE } = options;
  const offset = (page - 1) * pageSize;

  if (query) {
    let sql = `
      SELECT *
      FROM projects
      WHERE (
        full_name LIKE ?
        OR name LIKE ?
        OR description LIKE ?
        OR chinese_intro LIKE ?
        OR one_line_intro LIKE ?
        OR topics LIKE ?
      )
    `;
    const searchTerm = `%${query}%`;
    const params: Array<string | number> = [
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
    ];

    if (language) {
      sql += ' AND language = ?';
      params.push(language);
    }

    sql += ' ORDER BY synced_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const projects = db.prepare(sql).all(...params) as ProjectRow[];

    let countSql = `
      SELECT COUNT(*) as count
      FROM projects
      WHERE (
        full_name LIKE ?
        OR name LIKE ?
        OR description LIKE ?
        OR chinese_intro LIKE ?
        OR one_line_intro LIKE ?
        OR topics LIKE ?
      )
    `;
    const countParams: Array<string | number> = [
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
    ];

    if (language) {
      countSql += ' AND language = ?';
      countParams.push(language);
    }

    const countResult = db.prepare(countSql).get(...countParams) as { count: number };

    return {
      projects,
      total: countResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.count / pageSize),
    };
  }

  let sql = 'SELECT * FROM projects';
  const params: Array<string | number> = [];

  if (language) {
    sql += ' WHERE language = ?';
    params.push(language);
  }

  sql += ' ORDER BY synced_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const projects = db.prepare(sql).all(...params) as ProjectRow[];

  let countSql = 'SELECT COUNT(*) as count FROM projects';
  const countParams: Array<string | number> = [];

  if (language) {
    countSql += ' WHERE language = ?';
    countParams.push(language);
  }

  const countResult = db.prepare(countSql).get(...countParams) as { count: number };

  return {
    projects,
    total: countResult.count,
    page,
    pageSize,
    totalPages: Math.ceil(countResult.count / pageSize),
  };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getActivityStartDate(weeks: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getStarActivity(weeks = ACTIVITY_WEEKS) {
  const start = getActivityStartDate(weeks);
  const startKey = toDateKey(start);
  const rows = db.prepare(`
    SELECT DATE(starred_at) as date, COUNT(*) as count
    FROM projects
    WHERE starred_at IS NOT NULL AND DATE(starred_at) >= DATE(?)
    GROUP BY DATE(starred_at)
    ORDER BY DATE(starred_at) ASC
  `).all(startKey) as ActivityPoint[];

  const countByDate = new Map(rows.map((row) => [row.date, row.count]));
  const cells: ActivityPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const date = toDateKey(cursor);
    cells.push({
      date,
      count: countByDate.get(date) || 0,
    });
  }

  return cells;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page || '1', 10) || 1;
  const language = params.lang || undefined;
  const query = params.q || undefined;

  const [result, languages, profile] = await Promise.all([
    Promise.resolve(
      query
        ? searchProjects({ query, language, page, pageSize: HOME_PAGE_SIZE })
        : getProjects({ page, pageSize: HOME_PAGE_SIZE, language, sortBy: 'synced_at' })
    ),
    Promise.resolve(getLanguages()),
    fetchGitHubProfile(),
  ]);

  const [projectCount, wikiCount, recordedStarCount, activity] = [
    (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count,
    (db.prepare("SELECT COUNT(*) as count FROM projects WHERE wiki_status = 'completed'").get() as { count: number }).count,
    (db.prepare('SELECT COUNT(*) as count FROM projects WHERE starred_at IS NOT NULL').get() as { count: number }).count,
    getStarActivity(),
  ];

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Star Wiki',
    url: SITE_URL,
    description: '整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 简介与 Wiki 卡片浏览。',
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen">
      <Script
        id="website-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <BackgroundParticles />

      <div className="hero-wash pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(16,185,129,0.18),transparent_24%),radial-gradient(circle_at_78%_14%,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_52%_82%,rgba(251,191,36,0.08),transparent_22%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(52,211,153,0.14),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(251,146,60,0.13),transparent_20%),radial-gradient(circle_at_52%_82%,rgba(250,204,21,0.07),transparent_18%)]" />
        <div className="absolute left-[14%] top-[12%] h-52 w-52 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute right-[12%] top-[18%] h-60 w-60 rounded-full bg-orange-200/20 blur-3xl dark:bg-orange-300/10" />
        <div className="absolute bottom-[10%] left-[48%] h-44 w-44 rounded-full bg-amber-200/14 blur-3xl dark:bg-amber-300/8" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <div className="surface-chip flex h-10 w-10 items-center justify-center rounded-full">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Star Wiki</p>
            <p className="text-sm font-medium text-foreground">帮你搜索与回看 Star 过的项目</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-10 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_320px]">
          <Card className="surface-panel relative overflow-hidden rounded-[2rem] shadow-none">
            <HeroCodeBackdrop />
            <CardContent className="relative z-10 p-6 md:p-8">
              <div className="max-w-4xl space-y-5">
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-semibold leading-[1.03] tracking-[-0.05em] text-foreground md:text-5xl">
                    重新理解你 Star 过的项目。
                    <span className="mt-2 block text-balance text-muted-foreground">
                      让搜索、查找和回顾都更快，不再靠记忆翻列表。
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    把你的 GitHub Star 列表整理成可搜索、可筛选、可快速判断的项目库，方便你回头找到当时收藏过的工具、思路和方案。
                  </p>
                </div>
                <SearchBar defaultValue={query || ''} className="pt-2" />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <MetricPill label="项目" value={projectCount} />
                  <MetricPill label="Wiki 已生成" value={wikiCount} />
                  <MetricPill label="已记录 Star 时间" value={recordedStarCount} />
                  {query ? <MetricPill label="匹配结果" value={result.total} /> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel rounded-[2rem] shadow-none">
            <CardContent className="flex h-full flex-col justify-between gap-5 p-6">
              {profile ? (
                <>
                  <div className="space-y-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">GitHub Profile</p>
                    <div className="flex items-start gap-4">
                      <div
                        role="img"
                        aria-label={profile.login}
                        className="h-16 w-16 rounded-2xl border border-border/60 bg-cover bg-center"
                        style={{ backgroundImage: `url(${profile.avatar_url})` }}
                      />
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-lg font-semibold text-foreground">
                          {profile.name || profile.login}
                        </h2>
                        <p className="text-sm text-muted-foreground">@{profile.login}</p>
                      </div>
                    </div>
                    {profile.bio ? (
                      <p className="text-sm leading-7 text-muted-foreground">{profile.bio}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <ProfileMetric label="仓库" value={profile.public_repos} />
                    <ProfileMetric label="关注者" value={profile.followers} />
                    <ProfileMetric label="正在关注" value={profile.following} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      当前同步来源是 @{profile.login} 的 Star 列表
                    </div>
                    <Button
                      asChild
                      className="w-full rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
                    >
                      <a href={profile.html_url} target="_blank" rel="noreferrer">
                        查看 GitHub 主页
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">GitHub Profile</p>
                  <p className="text-lg font-medium leading-7 text-foreground">暂时无法读取 Star 用户资料。</p>
                  <p className="text-sm leading-7 text-muted-foreground">
                    但项目、搜索、分类和活动网格仍然可以正常使用。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <StarActivityGrid cells={activity} recordedCount={recordedStarCount} weeks={ACTIVITY_WEEKS} />

        <section className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Projects</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {query ? `“${query}” 的搜索结果` : '最新同步的项目卡片'}
                </h2>
              </div>
              <div className="text-sm text-muted-foreground">
                当前页展示 {result.projects.length} / 共 {result.total} 个项目
              </div>
            </div>
            <LanguageFilter languages={languages} activeLanguage={language || null} />
          </div>

          {result.projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.projects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          ) : (
            <Card className="surface-panel rounded-[1.8rem] border-dashed text-center shadow-none">
              <CardContent className="px-6 py-16">
                <div className="surface-chip mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                  <SearchCode className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">
                  {query ? '没有找到匹配的项目' : '还没有可展示的项目'}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {query ? '换一个关键词，或者切换语言筛选条件。' : '先触发 /api/sync，同步你的 GitHub Star 列表。'}
                </p>
              </CardContent>
            </Card>
          )}

          {result.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {Array.from({ length: Math.min(result.totalPages, 10) }, (_, index) => index + 1).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  asChild
                  variant={pageNumber === page ? 'default' : 'ghost'}
                  className="rounded-full"
                >
                  <Link href={`/?page=${pageNumber}${language ? `&lang=${language}` : ''}${query ? `&q=${query}` : ''}`}>
                    {pageNumber}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl items-center justify-between px-4 py-8 text-sm text-muted-foreground md:px-6">
        <div className="flex items-center gap-2">
          为 GitHub Star 检索而做
          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
        </div>
        <span className="inline-flex items-center gap-2">
          Search, intros, wiki cards
          <ArrowRight className="h-4 w-4" />
        </span>
      </footer>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-chip rounded-full px-4 py-2 text-sm shadow-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-chip rounded-2xl px-3 py-3 text-center">
      <div className="text-base font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}
