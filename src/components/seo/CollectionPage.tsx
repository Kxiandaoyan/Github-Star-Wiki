import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, BookOpen, Hash, Layers3, Star } from 'lucide-react';
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
  faq?: Array<{ question: string; answer: string }>;
}

export function CollectionPage({
  title,
  description,
  bucket,
  projects,
  canonicalPath,
  jsonLd = [],
  relatedLinks = [],
  faq = [],
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
              {bucket.count} 个项目
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

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
          <div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="surface-panel rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers3 className="h-4 w-4 text-primary" />
                页面摘要
              </div>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>当前聚合页围绕“{bucket.name}”组织站内相关项目，适合从稳定主题快速浏览、筛选并继续跳转到详情页。</p>
                <p>页面优先展示已经完成中文简介或详情内容的项目，便于快速判断用途、场景和上手方式。</p>
              </div>
            </div>

            {faq.length > 0 ? (
              <div className="surface-panel rounded-[1.8rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  常见问题
                </div>
                <div className="space-y-4">
                  {faq.map((item) => (
                    <div key={item.question} className="surface-chip rounded-2xl p-4">
                      <p className="font-medium text-foreground">{item.question}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="surface-panel rounded-[1.8rem] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                <Hash className="h-4 w-4 text-primary" />
                数据来源
              </div>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>项目列表来自用户自己的 GitHub Star 仓库集合。</p>
                <p>中文简介、Wiki 和专题能力来自 README、目录结构、关键文件与语义分析结果。</p>
                <p>排序默认更偏向高 Star 且内容较完整的项目，方便优先浏览高价值条目。</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-10 surface-panel rounded-[1.8rem] p-6 md:p-7">
          <div className="mb-5 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">为什么这个聚合页有价值</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-chip rounded-[1.4rem] p-5 text-sm leading-7 text-muted-foreground">
              自动把同主题项目聚合起来，降低手工整理成本。
            </div>
            <div className="surface-chip rounded-[1.4rem] p-5 text-sm leading-7 text-muted-foreground">
              每个项目都可以继续进入详情页，查看用途、安装和使用信息。
            </div>
            <div className="surface-chip rounded-[1.4rem] p-5 text-sm leading-7 text-muted-foreground">
              对搜索引擎来说，这类规则聚合页比普通搜索结果页更稳定，也更容易被收录。
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
