import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { ComponentType } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Github,
  Link2,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react';
import db from '@/lib/db';
import { getProjectById } from '@/lib/github';
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

  const description = project.chinese_intro || project.description || `${project.full_name} 的项目详情与 Wiki。`;

  return {
    title: project.full_name,
    description,
    alternates: {
      canonical: `/projects/${project.id}`,
    },
    openGraph: {
      title: project.full_name,
      description,
      type: 'article',
      url: `${SITE_URL}/projects/${project.id}`,
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
  const projectJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.full_name,
    codeRepository: project.html_url,
    programmingLanguage: project.language || undefined,
    description: project.chinese_intro || project.description || undefined,
    url: `${SITE_URL}/projects/${project.id}`,
  };

  return (
    <div className="min-h-screen">
      <Script
        id={`project-jsonld-${project.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />
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
              <div className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Project Profile
              </div>
              <h1 className="mt-4 break-words text-3xl font-semibold text-foreground md:text-5xl">
                {project.full_name}
              </h1>
              {project.description && (
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                  {project.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-foreground">{project.stars.toLocaleString()}</span>
                </span>
                {project.language && (
                  <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full', languageColor)} />
                    {project.language}
                  </span>
                )}
                {project.starred_at && (
                  <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Star 于 {formatDate(project.starred_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid min-w-[280px] gap-3 md:grid-cols-2 xl:grid-cols-1">
              <ActionLink href={project.html_url} icon={Github} label="查看 GitHub 仓库" />
              {project.homepage && (
                <ActionLink href={project.homepage} icon={ExternalLink} label="打开项目主页" />
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
          <div className="space-y-6">
            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">中文项目介绍</h2>
              </div>

              {project.intro_status === 'completed' && project.chinese_intro ? (
                <div className="prose max-w-none whitespace-pre-wrap text-muted-foreground">
                  {project.chinese_intro}
                </div>
              ) : project.intro_status === 'generating' ? (
                <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  正在生成中文介绍
                </div>
              ) : (
                <p className="text-muted-foreground">当前还没有生成详细的中文介绍。</p>
              )}
            </section>

            <section className="surface-panel rounded-[1.8rem] p-6 md:p-7">
              <div className="mb-5 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Wiki 目录与摘要</h2>
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
              ) : project.wiki_status === 'generating' ? (
                <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  正在生成 Wiki 目录
                </div>
              ) : (
                <p className="text-muted-foreground">当前还没有生成 Wiki 内容。</p>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="surface-panel rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                快速访问
              </div>
              <div className="space-y-3">
                <ActionLink href={project.html_url} icon={Github} label="GitHub 仓库" compact />
                {project.homepage && (
                  <ActionLink href={project.homepage} icon={ExternalLink} label="项目主页" compact />
                )}
              </div>
            </section>

            {wikiDocs.length > 0 && (
              <section className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  目录导航
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
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  compact = false,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  compact?: boolean;
}) {
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
