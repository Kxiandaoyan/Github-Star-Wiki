import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Compass,
  Eye,
  Lightbulb,
  Link2,
  MousePointer2,
  Network,
  Orbit,
  Sparkles,
} from 'lucide-react';
import { ProjectNetworkGraph } from '@/components/ProjectNetworkGraph';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { buildProjectGraph } from '@/lib/project-network';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

interface GraphPageProps {
  searchParams: Promise<{
    project?: string;
  }>;
}

export const metadata: Metadata = {
  title: '项目关系网图谱',
  description: '按用途、功能和语义关联浏览站内 GitHub Star 项目，快速重新发现以前收藏过但已经遗忘的项目。',
  alternates: {
    canonical: '/graph',
  },
  openGraph: {
    title: '项目关系网图谱 · Star Wiki',
    description: '按用途、功能和语义关联浏览站内 GitHub Star 项目。',
    type: 'website',
    url: `${SITE_URL}/graph`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '项目关系网图谱 · Star Wiki',
    description: '按用途、功能和语义关联浏览你的 GitHub Star 项目。',
  },
};

const USAGE_TIPS = [
  {
    icon: MousePointer2,
    title: '点击节点查看详情',
    description: '右侧面板会显示一句话介绍、用途标签和直接关联的项目',
  },
  {
    icon: Compass,
    title: '点击语义簇聚焦领域',
    description: '选中某个聚类后，同类项目会占据画面中心，其他聚类淡化',
  },
  {
    icon: Eye,
    title: '切换密度查看不同视角',
    description: '"聚焦" 只看核心、"平衡" 均衡展示、"全部" 展开所有节点',
  },
];

export default async function GraphPage({ searchParams }: GraphPageProps) {
  const params = await searchParams;
  const initialProjectId = params.project ? Number.parseInt(params.project, 10) : null;
  const graph = buildProjectGraph(1600);

  const topClusters = [...graph.clusters]
    .sort((a, b) => b.nodeCount - a.nodeCount)
    .slice(0, 4);

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '项目关系网图谱',
    description: `按用途、功能和语义关联浏览 ${graph.stats.nodeCount} 个 GitHub Star 项目。`,
    url: `${SITE_URL}/graph`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Star Wiki',
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <div id="top" className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(15,98,254,0.18),transparent_24%),radial-gradient(circle_at_78%_14%,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_52%_82%,rgba(16,185,129,0.12),transparent_22%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(143,210,255,0.16),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(251,146,60,0.14),transparent_20%),radial-gradient(circle_at_52%_82%,rgba(52,211,153,0.08),transparent_18%)]" />
        <div className="absolute left-[8%] top-[8%] h-64 w-64 rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute right-[10%] top-[14%] h-72 w-72 rounded-full bg-orange-200/14 blur-3xl dark:bg-orange-300/10" />
        <div className="absolute bottom-[8%] left-[42%] h-64 w-64 rounded-full bg-emerald-200/10 blur-3xl dark:bg-emerald-300/10" />
      </div>

      <SiteHeader breadcrumbs={[{ label: '项目关系网图谱' }]} />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-6">
        <section className="surface-panel rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Orbit className="h-3.5 w-3.5 text-primary" />
              Semantic Galaxy
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              {graph.stats.nodeCount} 个项目
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              {graph.stats.clusterCount} 个语义簇
            </span>
            <span className="surface-chip rounded-full px-3 py-1 text-xs text-foreground">
              {graph.stats.linkCount} 条关联边
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground md:text-5xl">
            项目关系网图谱
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            不按时间翻 Star 列表，而是按"项目解决什么问题、适合什么场景、彼此为什么相关"重新组织收藏。
            项目量达到几百上千时，关系网比单纯列表更能帮你重新发现真正有价值的工具。
          </p>

          {topClusters.length > 0 ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topClusters.map((cluster) => (
                <Link
                  key={cluster.id}
                  href={`/collections/${cluster.id}`}
                  className="surface-chip group rounded-2xl p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {cluster.label}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {cluster.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cluster.nodeCount} 个项目</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 surface-panel rounded-[1.6rem] p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="surface-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Lightbulb className="h-4 w-4 text-amber-500" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {USAGE_TIPS.map((tip) => (
                <div key={tip.title} className="flex items-start gap-2.5">
                  <tip.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{tip.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8">
          <ProjectNetworkGraph graph={graph} initialProjectId={initialProjectId} />
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            href="/collections"
            className="surface-panel group flex items-start gap-3 rounded-[1.6rem] p-6 transition-colors hover:border-primary/30"
          >
            <div className="surface-chip flex h-11 w-11 items-center justify-center rounded-2xl">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-foreground group-hover:text-primary">
                按专题浏览
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                把图谱里看到的聚类展开为聚合页，每个专题下列出所有项目。
              </p>
            </div>
          </Link>

          <Link
            href="/use-cases"
            className="surface-panel group flex items-start gap-3 rounded-[1.6rem] p-6 transition-colors hover:border-primary/30"
          >
            <div className="surface-chip flex h-11 w-11 items-center justify-center rounded-2xl">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-foreground group-hover:text-primary">
                按使用场景浏览
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                比技术名词更贴近真实目标，例如做 Agent / RAG / API / 部署。
              </p>
            </div>
          </Link>

          <Link
            href="/types"
            className="surface-panel group flex items-start gap-3 rounded-[1.6rem] p-6 transition-colors hover:border-primary/30"
          >
            <div className="surface-chip flex h-11 w-11 items-center justify-center rounded-2xl">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-foreground group-hover:text-primary">
                按项目类型浏览
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                看更宏观的形态分布：应用、库、CLI、模板、文档。
              </p>
            </div>
          </Link>
        </section>
      </main>

      <SiteFooter />
      </div>
    </>
  );
}
