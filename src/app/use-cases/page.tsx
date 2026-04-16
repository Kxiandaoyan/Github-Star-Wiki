import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Layers3,
  Lightbulb,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getUseCaseBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '使用场景聚合页',
  description: '按 AI Agent 开发、RAG、自动化、前端搭建、API、部署、提效、安全等真实任务场景，聚合站内 GitHub Star 项目。',
  alternates: {
    canonical: '/use-cases',
  },
  openGraph: {
    title: '使用场景聚合页',
    description: '按真实使用场景聚合站内 GitHub Star 项目。',
    url: `${SITE_URL}/use-cases`,
  },
};

interface Category {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  slugs: string[];
}

const CATEGORIES: Category[] = [
  {
    id: 'ai',
    label: 'AI 相关场景',
    description: '从 Agent 开发、RAG、模型训练到聊天机器人。',
    icon: Bot,
    accent: 'text-sky-500',
    slugs: ['ai-agent-development', 'chatbot-building', 'rag-implementation', 'model-training'],
  },
  {
    id: 'automation',
    label: '自动化场景',
    description: '工作流自动化、浏览器测试、数据采集。',
    icon: Workflow,
    accent: 'text-orange-500',
    slugs: ['workflow-automation', 'web-scraping', 'browser-testing'],
  },
  {
    id: 'frontend',
    label: '前端场景',
    description: 'UI 组件库、前端搭建、动画与特效。',
    icon: Sparkles,
    accent: 'text-violet-500',
    slugs: ['ui-development', 'frontend-building', 'animation-effects'],
  },
  {
    id: 'backend',
    label: '后端场景',
    description: 'API 开发、数据库管理、认证授权。',
    icon: Server,
    accent: 'text-cyan-500',
    slugs: ['api-development', 'database-management', 'authentication-setup'],
  },
  {
    id: 'devops',
    label: 'DevOps 场景',
    description: '部署、CI/CD 与系统监控。',
    icon: Rocket,
    accent: 'text-rose-500',
    slugs: ['deployment', 'cicd-pipeline', 'system-monitoring'],
  },
  {
    id: 'productivity',
    label: '开发提效与安全',
    description: '开发提效工具、内容管理与安全研究。',
    icon: Zap,
    accent: 'text-lime-500',
    slugs: ['developer-productivity', 'content-management', 'security-tooling'],
  },
];

export default function UseCasesIndexPage() {
  const useCases = getUseCaseBuckets(100);
  const useCaseMap = new Map(useCases.map((item) => [item.slug, item]));

  const grouped = CATEGORIES.map((category) => {
    const items = category.slugs
      .map((slug) => useCaseMap.get(slug))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    return { ...category, items };
  }).filter((group) => group.items.length > 0);

  const usedSlugs = new Set(grouped.flatMap((g) => g.items.map((i) => i.slug)));
  const orphans = useCases.filter((item) => !usedSlugs.has(item.slug));

  const totalProjects = useCases.reduce((sum, item) => sum + item.count, 0);

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '使用场景' }]} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-primary" />
            使用场景
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            按使用场景浏览
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
            比按技术名词更接近你的真实目标——想做 Agent、做 RAG、做自动化、搭前端还是部署系统？这里按 {useCases.length} 个真实任务场景、{totalProjects} 个项目聚合展示。
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {grouped.map((group) => {
              const count = group.items.reduce((sum, item) => sum + item.count, 0);
              return (
                <a
                  key={group.id}
                  href={`#${group.id}`}
                  className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 hover:text-foreground"
                >
                  <group.icon className={`h-3.5 w-3.5 ${group.accent}`} />
                  {group.label}
                  <span className="rounded-full bg-muted/60 px-2 py-0.5">{count}</span>
                </a>
              );
            })}
          </div>
        </section>

        <div className="mt-8 space-y-10">
          {grouped.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-24">
              <div className="flex items-start gap-3">
                <div className="surface-chip flex h-11 w-11 items-center justify-center rounded-2xl">
                  <group.icon className={`h-5 w-5 ${group.accent}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl">
                    {group.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((bucket) => (
                  <Link
                    key={bucket.slug}
                    href={bucket.href}
                    className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-5 text-foreground transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-6 group-hover:text-primary">
                        {bucket.title}
                      </h3>
                      <span className="surface-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        {bucket.count}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {bucket.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {orphans.length > 0 ? (
            <section className="scroll-mt-24">
              <div className="flex items-start gap-3">
                <div className="surface-chip flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Layers3 className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl">
                    其他场景
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">其他自动聚合出的使用场景。</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {orphans.map((bucket) => (
                  <Link
                    key={bucket.slug}
                    href={bucket.href}
                    className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-5 text-foreground hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-6 group-hover:text-primary">
                        {bucket.title}
                      </h3>
                      <span className="surface-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        {bucket.count}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {bucket.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <section className="mt-12 surface-panel rounded-[1.6rem] p-6 text-sm leading-7 text-muted-foreground">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-4 w-4 text-primary" />
            <p>
              使用场景页与专题页互为补充：专题页偏"更高一层的主题"，场景页偏"你要完成的任务"。
              想从主题视角浏览，访问
              <Link href="/collections" className="mx-1 text-foreground underline-offset-4 hover:underline">
                /collections
              </Link>
              。
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
