import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectCard } from '@/components/ProjectCard';
import type { ProjectListItem, TaxonomyBucket } from '@/lib/taxonomy';

interface CollectionPageProps {
  title: string;
  description: string;
  bucket: TaxonomyBucket;
  projects: ProjectListItem[];
  canonicalPath: string;
  jsonLd?: Record<string, unknown>[];
  relatedLinks?: Array<{ href: string; label: string }>;
}

export function CollectionPage({
  title,
  description,
  bucket,
  projects,
  canonicalPath,
  jsonLd = [],
  relatedLinks = [],
}: CollectionPageProps) {
  return (
    <div className="min-h-screen">
      {jsonLd.map((item, index) => (
        <Script
          key={`${canonicalPath}-${index}`}
          id={`${canonicalPath.replace(/[^\w-]/g, '-')}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
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

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              聚合页面
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {bucket.count} 个项目
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            {description}
          </p>

          {relatedLinks.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="surface-chip rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          ) : (
            <div className="surface-panel rounded-[1.8rem] px-6 py-8 text-sm leading-7 text-muted-foreground">
              当前聚合页还没有可展示的项目。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
