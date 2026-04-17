import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  GitCompare,
  Github,
  Globe,
  Layers3,
  Lightbulb,
  Sparkles,
  Star,
} from 'lucide-react';
import { ClearCompareOnMountFromIds } from '@/components/CompareUtils';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { loadCompareProjects, type CompareProject } from '@/lib/compare';
import { cn } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>;
}

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 4);
}

export async function generateMetadata({ searchParams }: ComparePageProps): Promise<Metadata> {
  const { ids: raw } = await searchParams;
  const ids = parseIds(raw);
  const projects = ids.length > 0 ? loadCompareProjects(ids) : [];

  const title = projects.length > 0
    ? `对比 · ${projects.map((p) => p.name || p.full_name).join(' vs ')}`
    : '对比项目';

  return {
    title,
    description: projects.length > 0
      ? `并排对比 ${projects.map((p) => p.full_name).join('、')} 的用途、能力、使用场景，帮助你快速做出选型决策。`
      : '在项目卡片或详情页点"加入对比"后，可以并排查看多个项目的用途、能力和使用场景。',
    alternates: { canonical: ids.length > 0 ? `/compare?ids=${ids.join(',')}` : '/compare' },
    robots: projects.length >= 2 ? { index: false, follow: true } : { index: false, follow: true },
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids: raw } = await searchParams;
  const ids = parseIds(raw);
  const projects = ids.length > 0 ? loadCompareProjects(ids) : [];

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '项目对比' }]} />

      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <ClearCompareOnMountFromIds ids={projects.map((p) => p.id)} />

        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <GitCompare className="h-3.5 w-3.5 text-primary" />
              Compare
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              {projects.length > 0 ? `${projects.length} 个项目` : '未选择项目'}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground md:text-5xl">
            项目并排对比
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            在项目卡片或详情页点"加入对比"按钮，就能在这里并排查看多个项目的用途、能力、使用场景。
            特别适合在相似工具之间做选型决策，一次最多对比 4 个项目。
          </p>
        </section>

        {projects.length === 0 ? (
          <EmptyState />
        ) : projects.length === 1 ? (
          <OneOnlyNotice project={projects[0]} />
        ) : (
          <CompareTable projects={projects} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-8 surface-panel rounded-[1.8rem] px-6 py-16 text-center md:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/60">
        <GitCompare className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">还没有选择要对比的项目</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
        到<Link href="/" className="mx-1 text-foreground underline-offset-4 hover:underline">首页</Link>
        或任意
        <Link href="/collections" className="mx-1 text-foreground underline-offset-4 hover:underline">专题页</Link>
        上，点项目右上角的"加入对比"。选够 2 个以上再回到这里。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
        >
          去首页挑项目
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/collections"
          className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
        >
          浏览专题
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

function OneOnlyNotice({ project }: { project: CompareProject }) {
  return (
    <section className="mt-8 surface-panel rounded-[1.8rem] px-6 py-12 text-center md:p-10">
      <p className="text-sm text-muted-foreground">目前只选中了一个项目：</p>
      <h2 className="mt-2 text-2xl font-semibold text-foreground">{project.full_name}</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        再添加至少一个项目到对比列表，就能在这里并排查看差异。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
        >
          回到 {project.name} 详情页
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/"
          className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
        >
          挑选更多项目
        </Link>
      </div>
    </section>
  );
}

function CompareTable({ projects }: { projects: CompareProject[] }) {
  const columnClass =
    projects.length === 2
      ? 'grid gap-4 md:grid-cols-2'
      : projects.length === 3
        ? 'grid gap-4 md:grid-cols-3'
        : 'grid gap-4 md:grid-cols-2 xl:grid-cols-4';

  // 公共维度
  const sharedClusterId =
    projects.every((p) => p.cluster && p.cluster.id === projects[0].cluster?.id)
      ? projects[0].cluster?.id
      : null;
  const allLanguages = Array.from(new Set(projects.map((p) => p.language).filter(Boolean)));
  const starsSorted = [...projects].map((p) => p.stars).sort((a, b) => b - a);
  const maxStars = starsSorted[0] || 0;

  return (
    <>
      {/* 概览提示 */}
      <section className="mt-6 surface-panel rounded-[1.4rem] p-4 md:p-5">
        <div className="flex items-start gap-3 text-sm leading-7 text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            {sharedClusterId ? (
              <span>
                这 {projects.length} 个项目都属于{' '}
                <span className="font-medium text-foreground">
                  {projects[0].cluster?.label}
                </span>{' '}
                这个语义簇，通常解决相似问题。下方按能力、场景、关键词逐项对比。
              </span>
            ) : (
              <span>
                这些项目分属不同语义簇（
                {projects.map((p) => p.cluster?.label).filter(Boolean).join(' / ')}
                ），可能定位不同，请重点看"用途"和"能力关键词"行的差异。
              </span>
            )}
            {allLanguages.length > 1 ? (
              <span className="ml-1">编程语言差异：{allLanguages.join(' · ')}。</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* 项目卡片头部：标题 + 核心元信息 + 跳转链接 */}
      <section className={cn('mt-6', columnClass)}>
        {projects.map((project) => (
          <article
            key={project.id}
            className="surface-panel rounded-[1.6rem] p-5 md:p-6"
          >
            <div className="flex items-center gap-2">
              <span className="surface-chip rounded-full px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {project.project_type_label}
              </span>
              {project.stars === maxStars && projects.length > 1 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <Star className="h-3 w-3" />
                  最热门
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 break-words text-lg font-semibold leading-6 text-foreground">
              <Link
                href={`/projects/${project.id}`}
                className="transition-colors hover:text-primary"
              >
                {project.full_name}
              </Link>
            </h2>
            {project.one_line_intro ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.one_line_intro}</p>
            ) : project.description ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{project.description}</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted-foreground/60">暂无一句话介绍</p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Fact label="Stars" value={project.stars.toLocaleString('en-US')} />
              <Fact label="语言" value={project.language || '—'} />
              {project.cluster ? (
                <Fact
                  label="语义簇"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: project.cluster.color }}
                      />
                      {project.cluster.label}
                    </span>
                  }
                />
              ) : null}
              {project.updated_at ? (
                <Fact label="最后更新" value={project.updated_at.slice(0, 10)} />
              ) : null}
            </dl>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <a
                href={project.html_url}
                target="_blank"
                rel="noreferrer"
                className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Github className="h-3 w-3" />
                GitHub
              </a>
              {project.homepage ? (
                <a
                  href={project.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-3 w-3" />
                  主页
                </a>
              ) : null}
              <Link
                href={`/projects/${project.id}`}
                className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                详情页
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* 逐行对比矩阵 */}
      <section className="mt-6 surface-panel rounded-[1.8rem] overflow-hidden">
        <CompareRow
          title="适用场景"
          icon={Lightbulb}
          projects={projects}
          getValues={(p) => p.use_cases}
          kind="pills"
        />
        <CompareRow
          title="核心能力"
          icon={Layers3}
          projects={projects}
          getValues={(p) => p.capabilities}
          kind="pills"
        />
        <CompareRow
          title="关键词"
          icon={Sparkles}
          projects={projects}
          getValues={(p) => p.keywords}
          kind="pills"
          compact
        />
        <CompareRow
          title="Topics"
          icon={Sparkles}
          projects={projects}
          getValues={(p) => p.topics}
          kind="pills"
          compact
        />
        <CompareRow
          title="解决的问题"
          icon={Lightbulb}
          projects={projects}
          getValues={(p) => (p.problem_solved ? [p.problem_solved] : [])}
          kind="text"
        />
        <CompareRow
          title="中文介绍"
          icon={BookOpen}
          projects={projects}
          getValues={(p) => (p.chinese_intro_excerpt ? [p.chinese_intro_excerpt] : [])}
          kind="text"
        />
        <CompareRow
          title="首章节内容"
          icon={BookOpen}
          projects={projects}
          getValues={(p) =>
            p.wiki_titles.length > 0 && p.first_wiki_excerpt
              ? [`【${p.wiki_titles[0]}】 ${p.first_wiki_excerpt}`]
              : []
          }
          kind="text"
        />
        <CompareRow
          title="Wiki 章节"
          icon={BookOpen}
          projects={projects}
          getValues={(p) => p.wiki_titles}
          kind="pills"
          compact
          last
        />
      </section>

      <section className="mt-6 surface-panel rounded-[1.4rem] p-5 text-sm leading-7 text-muted-foreground">
        <div className="flex items-start gap-3">
          <GitCompare className="mt-1 h-4 w-4 shrink-0 text-primary" />
          <p>
            对比数据基于每个项目的 AI 语义画像和 Wiki 章节。
            {projects.some((p) => !p.is_complete) ? '其中部分项目还未完成生成，已展示现有信息。' : ''}
            可以把当前对比链接收藏或分享，参数 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">?ids=1,2,3</code> 表示选中的项目 ID。
          </p>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function CompareRow({
  title,
  icon: Icon,
  projects,
  getValues,
  kind,
  compact = false,
  last = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  projects: CompareProject[];
  getValues: (p: CompareProject) => string[];
  kind: 'pills' | 'text';
  compact?: boolean;
  last?: boolean;
}) {
  const columnClass =
    projects.length === 2
      ? 'md:grid-cols-[180px_1fr_1fr]'
      : projects.length === 3
        ? 'md:grid-cols-[180px_1fr_1fr_1fr]'
        : 'md:grid-cols-[180px_1fr_1fr_1fr_1fr]';

  return (
    <div
      className={cn(
        'grid gap-0 md:grid',
        columnClass,
        !last && 'border-b border-border/40'
      )}
    >
      <div className="border-b border-border/40 bg-muted/20 px-5 py-4 md:border-b-0 md:border-r md:border-border/40">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </div>
      </div>
      {projects.map((project, index) => {
        const values = getValues(project);
        const isLastCol = index === projects.length - 1;
        return (
          <div
            key={project.id}
            className={cn(
              'px-5 py-4',
              !isLastCol && 'md:border-r md:border-border/40'
            )}
          >
            {values.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">—</p>
            ) : kind === 'pills' ? (
              <div className="flex flex-wrap gap-1.5">
                {values.slice(0, compact ? 8 : 6).map((value, idx) => (
                  <span
                    key={`${value}-${idx}`}
                    className={cn(
                      'surface-chip inline-flex items-center rounded-full px-2.5 py-0.5 text-foreground',
                      compact ? 'text-[11px]' : 'text-xs'
                    )}
                  >
                    {value}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                {values[0]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
