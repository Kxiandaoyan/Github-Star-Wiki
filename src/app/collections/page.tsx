import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Brain,
  Code2,
  Database,
  Hammer,
  Layers3,
  Network,
  Palette,
  Puzzle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSpecialCollectionBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: '自动专题聚合页',
  description: '基于站内 GitHub Star 项目自动生成的专题聚合页，按 AI Agent、自动化、前端、后端、DevOps、内容等大类重新组织你的项目库。',
  alternates: {
    canonical: '/collections',
  },
  openGraph: {
    title: '自动专题聚合页',
    description: '基于站内 GitHub Star 项目自动生成的专题聚合页。',
    url: `${SITE_URL}/collections`,
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
    label: 'AI · Agent · LLM',
    description: '智能体、LLM 应用、RAG 检索与模型训练。',
    icon: Bot,
    accent: 'text-sky-500',
    slugs: ['ai-agents', 'llm-apps', 'rag-retrieval', 'ml-training'],
  },
  {
    id: 'automation',
    label: '自动化与抓取',
    description: '工作流编排、RPA、浏览器自动化与爬虫。',
    icon: Brain,
    accent: 'text-orange-500',
    slugs: ['automation', 'browser-automation'],
  },
  {
    id: 'frontend',
    label: '前端与 UI',
    description: '组件库、设计系统、前端框架与动画。',
    icon: Palette,
    accent: 'text-violet-500',
    slugs: ['ui-experience', 'frontend-frameworks', 'data-viz'],
  },
  {
    id: 'devtools',
    label: '开发工具',
    description: 'CLI、终端、代码质量与代码智能。',
    icon: Code2,
    accent: 'text-lime-500',
    slugs: ['cli-terminal', 'developer-tooling', 'code-intelligence'],
  },
  {
    id: 'backend',
    label: '后端与数据',
    description: 'API 框架、数据库、认证安全。',
    icon: Database,
    accent: 'text-cyan-500',
    slugs: ['backend-api', 'database-storage', 'auth-security'],
  },
  {
    id: 'devops',
    label: 'DevOps 与基础设施',
    description: '容器、CI/CD、监控与可观测。',
    icon: Network,
    accent: 'text-rose-500',
    slugs: ['devops-infra', 'observability'],
  },
  {
    id: 'content',
    label: '内容 · 模板 · 应用',
    description: '文档、知识库、模板与自托管应用。',
    icon: Layers3,
    accent: 'text-amber-500',
    slugs: ['knowledge-content', 'starter-kits', 'product-apps'],
  },
];

export default function CollectionsIndexPage() {
  const collections = getSpecialCollectionBuckets(40);
  const collectionMap = new Map(collections.map((item) => [item.slug, item]));

  const grouped = CATEGORIES.map((category) => {
    const items = category.slugs
      .map((slug) => collectionMap.get(slug))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    return { ...category, items };
  }).filter((group) => group.items.length > 0);

  const usedSlugs = new Set(grouped.flatMap((g) => g.items.map((i) => i.slug)));
  const orphans = collections.filter((item) => !usedSlugs.has(item.slug));

  const totalProjects = collections.reduce((sum, item) => sum + item.count, 0);
  const totalTopics = collections.length;

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader breadcrumbs={[{ label: '自动专题' }]} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
            <Layers3 className="h-4 w-4 text-primary" />
            自动专题
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            自动专题聚合页
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            不靠人工写稿，按语义画像、标签和项目用途自动聚合生成。共 {totalTopics} 个专题、覆盖 {totalProjects} 个项目，按 7 个大类分组，帮你从"更高的一层"重新浏览 Star 过的项目。
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
                {group.items.map((collection) => (
                  <Link
                    key={collection.slug}
                    href={collection.href}
                    className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-5 text-foreground transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-6 group-hover:text-primary">
                        {collection.title}
                      </h3>
                      <span className="surface-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        {collection.count}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {collection.description}
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
                  <Puzzle className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl">
                    其他专题
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">其他自动聚合出的专题。</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {orphans.map((collection) => (
                  <Link
                    key={collection.slug}
                    href={collection.href}
                    className="surface-panel group flex flex-col gap-3 rounded-[1.6rem] p-5 text-foreground hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-6 group-hover:text-primary">
                        {collection.title}
                      </h3>
                      <span className="surface-chip shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground">
                        {collection.count}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {collection.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <section className="mt-12 surface-panel rounded-[1.6rem] p-6 text-sm leading-7 text-muted-foreground">
          <div className="flex items-start gap-3">
            <Hammer className="mt-1 h-4 w-4 text-primary" />
            <p>
              如果某个专题下的项目数量和你预期不符，可能需要重新生成语义画像。你可以在
              <Link href="/admin" className="mx-1 text-foreground underline-offset-4 hover:underline">
                后台
              </Link>
              触发"回填语义缓存"或对单项目执行重写，分类会根据最新画像自动刷新。
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
