import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { ComponentType } from 'react';
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ExternalLink,
  Github,
  HelpCircle,
  Lightbulb,
  Link2,
  Orbit,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react';
import db from '@/lib/db';
import { getProjectById } from '@/lib/github';
import type { FaqItem, MindMapNode } from '@/lib/llm';
import {
  getMatchingSpecialCollectionsForProject,
  getMatchingUseCasesForProject,
  getProjectTypeLinkForProject,
  getRelatedProjects,
  parseTopics,
  slugifyTaxonomyValue,
} from '@/lib/taxonomy';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface WikiDocument {
  id: number;
  title: string;
  content: string;
}

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const languageColors: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-amber-400',
  Python: 'bg-emerald-500',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  'C++': 'bg-pink-500',
  Ruby: 'bg-rose-500',
  PHP: 'bg-violet-500',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-fuchsia-500',
  default: 'bg-slate-400',
};

const projectTypeLabelMap: Record<string, string> = {
  app: '应用项目',
  library: '库 / SDK',
  cli: '命令行工具',
  plugin: '插件扩展',
  ui: 'UI 组件库',
  template: '模板 / Starter',
  docs: '文档型项目',
  'awesome-list': '资源合集',
  content: '内容型项目',
  config: '配置型项目',
  unknown: '开源项目',
};

function formatDate(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function parseMindMap(rawMindMap: string | null): MindMapNode | null {
  if (!rawMindMap) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMindMap) as MindMapNode;
    return parsed?.label ? parsed : null;
  } catch {
    return null;
  }
}

function parseFaqItems(rawFaqJson: string | null): FaqItem[] {
  if (!rawFaqJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawFaqJson) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const faq = item as { question?: unknown; answer?: unknown };
        return {
          question: typeof faq.question === 'string' ? faq.question.trim() : '',
          answer: typeof faq.answer === 'string' ? faq.answer.trim() : '',
        };
      })
      .filter((item) => item.question && item.answer);
  } catch {
    return [];
  }
}

function getMindMapFallback(projectType: string | null) {
  const type = projectType || 'unknown';

  if (type === 'docs' || type === 'awesome-list' || type === 'content') {
    return '这个仓库更偏文档、资源整理或内容型项目，通常没有稳定的代码模块结构，因此不强行生成思维导图。';
  }

  if (type === 'template' || type === 'config') {
    return '这个仓库更偏模板或配置分发，结构可能很轻，不一定适合抽成稳定的思维导图。';
  }

  return '当前仓库信息不足，或者结构不够稳定，暂时没有生成可靠的思维导图。';
}

function getProjectTaskLabel(taskType: string | null | undefined, taskStatus: string | null | undefined) {
  const prefix = taskStatus === 'processing' ? '正在' : '等待';

  switch (taskType) {
    case 'scan_repo':
      return `${prefix}扫描仓库`;
    case 'analyze_repo':
      return `${prefix}分析仓库用途`;
    case 'deep_read_repo':
      return `${prefix}深读关键代码`;
    case 'generate_profile':
      return `${prefix}生成介绍与文档`;
    default:
      return taskStatus === 'processing' ? '正在生成内容' : '等待生成内容';
  }
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  const project = getProjectById(id);

  if (!project) {
    return {
      title: '项目不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = project.seo_title || `${project.full_name} 是什么？用途、安装与使用指南`;
  const description = project.seo_description
    || project.chinese_intro
    || project.one_line_intro
    || project.description
    || `${project.full_name} 的项目介绍、用途、安装方式与使用说明。`;
  const hasIndexableContent = project.intro_status === 'completed'
    || project.wiki_status === 'completed'
    || Boolean(project.seo_title);

  return {
    title,
    description,
    alternates: {
      canonical: `/projects/${project.id}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/projects/${project.id}`,
    },
    robots: hasIndexableContent
      ? {
        index: true,
        follow: true,
      }
      : {
        index: false,
        follow: true,
      },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  const project = getProjectById(id);

  if (!project) {
    notFound();
  }

  const wikiDocs = db
    .prepare('SELECT * FROM wiki_documents WHERE project_id = ? ORDER BY sort_order')
    .all(id) as WikiDocument[];

  const languageColor = languageColors[project.language || ''] || languageColors.default;
  const mindMap = parseMindMap(project.mind_map);
  const faqItems = parseFaqItems(project.faq_json);
  const projectTopics = parseTopics(project.topics);
  const relatedProjects = getRelatedProjects(project.id, 6);
  const matchingSpecialCollections = getMatchingSpecialCollectionsForProject(project.id).slice(0, 3);
  const matchingUseCases = getMatchingUseCasesForProject(project.id).slice(0, 3);
  const projectTypeLink = getProjectTypeLinkForProject(project.id);
  const projectTypeLabel = projectTypeLabelMap[project.project_type || 'unknown'] || projectTypeLabelMap.unknown;
  const title = project.seo_title || `${project.full_name} 是什么？用途、安装与使用指南`;
  const description = project.seo_description
    || project.chinese_intro
    || project.one_line_intro
    || project.description
    || `${project.full_name} 的项目介绍、用途、安装方式与使用说明。`;

  const projectJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.full_name,
    codeRepository: project.html_url,
    programmingLanguage: project.language || undefined,
    description,
    url: `${SITE_URL}/projects/${project.id}`,
  };

  const faqJsonLd = faqItems.length > 0
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }
    : null;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '项目',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: project.full_name,
        item: `${SITE_URL}/projects/${project.id}`,
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <Script
        id={`project-jsonld-${project.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />
      <Script
        id={`project-breadcrumb-jsonld-${project.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <Script
          id={`project-faq-jsonld-${project.id}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-20 h-52 w-52 rounded-full bg-sky-400/14 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute right-[10%] top-14 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-300/8" />
        <div className="absolute bottom-8 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl dark:bg-blue-400/8" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link
            href="/"
            className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回项目列表
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  项目档案
                </span>
                <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
                  {projectTypeLabel}
                </span>
              </div>

              <h1 className="mt-4 break-words text-3xl font-semibold text-foreground md:text-5xl">
                {title}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                {description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-foreground">{project.stars.toLocaleString()}</span>
                </span>

                {project.language ? (
                  <Link
                    href={`/languages/${slugifyTaxonomyValue(project.language)}`}
                    className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 hover:text-foreground"
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', languageColor)} />
                    {project.language}
                  </Link>
                ) : null}

                {project.starred_at ? (
                  <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Star 于 {formatDate(project.starred_at)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid min-w-[280px] gap-3 md:grid-cols-2 xl:grid-cols-1">
              <ActionLink href={project.html_url} icon={Github} label="查看 GitHub 仓库" />
              {project.homepage ? (
                <ActionLink href={project.homepage} icon={ExternalLink} label="打开项目主页" />
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="space-y-6">
            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">AI 总结</h2>
              </div>

              {project.one_line_status === 'completed' && project.one_line_intro ? (
                <p className="rounded-[1.4rem] border border-border/60 bg-background/30 px-5 py-4 text-base leading-8 text-foreground/90">
                  {project.one_line_intro}
                </p>
              ) : project.current_task_type ? (
                <LoadingChip
                  label={getProjectTaskLabel(project.current_task_type, project.current_task_status)}
                  pending={project.current_task_status !== 'processing'}
                />
              ) : project.one_line_status === 'generating' ? (
                <LoadingChip label="正在生成一句话总结" />
              ) : (
                <p className="text-muted-foreground">当前还没有生成一句话总结。</p>
              )}
            </section>

            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">中文项目介绍</h2>
              </div>

              {project.intro_status === 'completed' && project.chinese_intro ? (
                <div className="prose max-w-none whitespace-pre-wrap text-muted-foreground">
                  {project.chinese_intro}
                </div>
              ) : project.current_task_type ? (
                <LoadingChip
                  label={getProjectTaskLabel(project.current_task_type, project.current_task_status)}
                  pending={project.current_task_status !== 'processing'}
                />
              ) : project.intro_status === 'generating' ? (
                <LoadingChip label="正在生成中文介绍" />
              ) : (
                <p className="text-muted-foreground">当前还没有生成详细的中文介绍。</p>
              )}
            </section>

            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">详细信息与使用说明</h2>
              </div>

              {project.wiki_status === 'completed' && wikiDocs.length > 0 ? (
                <div className="space-y-8">
                  {wikiDocs.map((doc, index) => (
                    <article key={doc.id} id={`wiki-${doc.id}`} className="surface-chip rounded-[1.5rem] p-5">
                      <h3 className="text-lg font-semibold text-foreground">
                        {index + 1}. {doc.title}
                      </h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                        {doc.content}
                      </p>
                    </article>
                  ))}
                </div>
              ) : project.current_task_type ? (
                <LoadingChip
                  label={getProjectTaskLabel(project.current_task_type, project.current_task_status)}
                  pending={project.current_task_status !== 'processing'}
                />
              ) : project.wiki_status === 'generating' ? (
                <LoadingChip label="正在生成详细章节" />
              ) : (
                <p className="text-muted-foreground">当前还没有生成详细章节内容。</p>
              )}
            </section>

            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">思维导图</h2>
              </div>

              {mindMap ? (
                <div className="overflow-x-auto rounded-[1.5rem] border border-border/60 bg-background/25 p-5">
                  <MindMapTree node={mindMap} depth={0} />
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/20 px-5 py-5 text-sm leading-7 text-muted-foreground">
                  {getMindMapFallback(project.project_type)}
                </div>
              )}
            </section>

            {faqItems.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">常见问题</h2>
                </div>

                <div className="space-y-4">
                  {faqItems.map((item) => (
                    <article key={item.question} className="surface-chip rounded-[1.4rem] p-5">
                      <h3 className="text-base font-semibold text-foreground">{item.question}</h3>
                      <p className="mt-3 text-sm leading-8 text-muted-foreground">{item.answer}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            <section className="surface-panel rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                相关入口
              </div>
              <div className="space-y-3">
                {project.language ? (
                  <Link
                    href={`/languages/${slugifyTaxonomyValue(project.language)}`}
                    className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    查看更多 {project.language} 项目
                  </Link>
                ) : null}
                {projectTopics.slice(0, 3).map((topic) => (
                  <Link
                    key={topic}
                    href={`/topics/${slugifyTaxonomyValue(topic)}`}
                    className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    进入 {topic} 专题页
                  </Link>
                ))}
                {matchingSpecialCollections.map((collection) => (
                  <Link
                    key={collection.slug}
                    href={collection.href}
                    className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    进入 {collection.title}
                  </Link>
                ))}
                {matchingUseCases.map((useCase) => (
                  <Link
                    key={useCase.slug}
                    href={useCase.href}
                    className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    进入 {useCase.title}
                  </Link>
                ))}
                {projectTypeLink ? (
                  <Link
                    href={projectTypeLink.href}
                    className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                  >
                    查看更多 {projectTypeLink.title}
                  </Link>
                ) : null}
                <Link
                  href="/topics"
                  className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  浏览全部技术标签
                </Link>
              </div>
            </section>

            <section className="surface-panel rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                快速访问
              </div>
              <div className="space-y-3">
                <ActionLink href={project.html_url} icon={Github} label="GitHub 仓库" compact />
                {project.homepage ? (
                  <ActionLink href={project.homepage} icon={ExternalLink} label="项目主页" compact />
                ) : null}
                <ActionLink href={`/graph?project=${project.id}`} icon={Orbit} label="在关系网中查看" compact internal />
              </div>
            </section>

            {projectTopics.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  相关标签
                </div>
                <div className="flex flex-wrap gap-2">
                  {projectTopics.map((topic) => (
                    <Link
                      key={topic}
                      href={`/topics/${slugifyTaxonomyValue(topic)}`}
                      className="surface-chip rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {matchingSpecialCollections.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  自动专题
                </div>
                <div className="space-y-3">
                  {matchingSpecialCollections.map((collection) => (
                    <Link
                      key={collection.slug}
                      href={collection.href}
                      className="surface-chip block rounded-2xl px-4 py-4"
                    >
                      <p className="text-sm font-medium text-foreground">{collection.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{collection.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {matchingUseCases.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  适用场景
                </div>
                <div className="space-y-3">
                  {matchingUseCases.map((useCase) => (
                    <Link
                      key={useCase.slug}
                      href={useCase.href}
                      className="surface-chip block rounded-2xl px-4 py-4"
                    >
                      <p className="text-sm font-medium text-foreground">{useCase.title}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{useCase.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {wikiDocs.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  章节导航
                </div>
                <nav className="space-y-2">
                  {wikiDocs.map((doc, index) => (
                    <a
                      key={doc.id}
                      href={`#wiki-${doc.id}`}
                      className="surface-chip block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {index + 1}. {doc.title}
                    </a>
                  ))}
                </nav>
              </section>
            ) : null}

            {relatedProjects.length > 0 ? (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-primary" />
                  相关项目
                </div>
                <div className="space-y-3">
                  {relatedProjects.map((item) => (
                    <Link
                      key={item.id}
                      href={`/projects/${item.id}`}
                      className="surface-chip block rounded-2xl px-4 py-4"
                    >
                      <p className="text-sm font-medium text-foreground">{item.full_name}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">
                        {item.one_line_intro || item.description || '查看这个相关项目的详情页。'}
                      </p>
                      {item.reason.length > 0 ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground/90">
                          {item.reason.join(' / ')}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}

function LoadingChip({ label, pending = false }: { label: string; pending?: boolean }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-full px-4 py-2',
        pending
          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border border-primary/20 bg-primary/10 text-primary'
      )}
    >
      <RefreshCw className={cn('h-4 w-4', pending ? '' : 'animate-spin')} />
      {label}
    </div>
  );
}

function MindMapTree({ node, depth }: { node: MindMapNode; depth: number }) {
  return (
    <div className={cn(depth > 0 ? 'ml-6 border-l border-border/70 pl-5' : '')}>
      <div className="surface-chip inline-flex rounded-2xl px-4 py-2 text-sm font-medium text-foreground">
        {node.label}
      </div>
      {node.children && node.children.length > 0 ? (
        <div className="mt-4 space-y-4">
          {node.children.map((child, index) => (
            <MindMapTree key={`${child.label}-${index}`} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  compact = false,
  internal = false,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  compact?: boolean;
  internal?: boolean;
}) {
  if (internal) {
    return (
      <Link
        href={href}
        className={cn(
          'surface-chip inline-flex items-center gap-3 text-sm text-foreground hover:text-primary',
          compact ? 'w-full rounded-[1.2rem] px-4 py-3' : 'justify-center rounded-[1.2rem] px-5 py-4'
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'surface-chip inline-flex items-center gap-3 text-sm text-foreground hover:text-primary',
        compact ? 'w-full rounded-[1.2rem] px-4 py-3' : 'justify-center rounded-[1.2rem] px-5 py-4'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}
