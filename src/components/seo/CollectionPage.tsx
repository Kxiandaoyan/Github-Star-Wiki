import Link from 'next/link';
import { ArrowRight, Folder, Layers3 } from 'lucide-react';
import type { BreadcrumbItem } from '@/components/Breadcrumbs';
import { ProjectCard } from '@/components/ProjectCard';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import type { ProjectListItem, TaxonomyBucket } from '@/lib/taxonomy';

interface CollectionPageProps {
  title: string;
  description: string;
  bucket: TaxonomyBucket;
  projects: ProjectListItem[];
  canonicalPath: string;
  jsonLd?: Record<string, unknown>[];
  relatedLinks?: Array<{ href: string; label: string }>;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * 页面层级描述，例如"专题"、"使用场景"、"按语言"等
   */
  kind?: string;
  /**
   * 返回上一层的链接，例如 /collections、/use-cases
   */
  parentHref?: string;
  parentLabel?: string;
}

export function CollectionPage({
  title,
  description,
  bucket,
  projects,
  canonicalPath,
  jsonLd = [],
  relatedLinks = [],
  breadcrumbs,
  kind = '聚合页面',
  parentHref,
  parentLabel,
}: CollectionPageProps) {
  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const completedCount = projects.filter((p) => p.one_line_status === 'completed').length;

  return (
    <div id="top" className="min-h-screen">
      {jsonLd.map((item, index) => (
        <script
          key={`${canonicalPath}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <SiteHeader
        breadcrumbs={breadcrumbs}
        backHref={parentHref || '/'}
        backLabel={parentLabel || '返回首页'}
      />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              {kind}
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              共 {bucket.count} 个项目
            </span>
            {completedCount > 0 && completedCount < bucket.count ? (
              <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
                {completedCount} 个已生成 Wiki
              </span>
            ) : null}
            {totalStars > 0 ? (
              <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
                合计 ★ {totalStars.toLocaleString()}
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground md:text-5xl">
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
                  className="surface-chip inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Folder className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}

          {parentHref ? (
            <div className="mt-6">
              <Link
                href={parentHref}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                查看全部{parentLabel || '聚合页面'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              项目列表
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                按 stars 从高到低
              </span>
            </h2>
          </div>

          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          ) : (
            <div className="surface-panel rounded-[1.6rem] px-6 py-12 text-center text-sm leading-7 text-muted-foreground">
              <p className="text-foreground">当前聚合页还没有可展示的项目。</p>
              <p className="mt-2 text-xs">后台触发同步并生成 Wiki 后，相关项目会自动出现在这里。</p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
