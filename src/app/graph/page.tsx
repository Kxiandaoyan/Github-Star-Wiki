import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Orbit } from 'lucide-react';
import { ProjectNetworkGraph } from '@/components/ProjectNetworkGraph';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    title: '项目关系网图谱',
    description: '按用途、功能和语义关联浏览站内 GitHub Star 项目。',
    url: `${SITE_URL}/graph`,
  },
};

export default async function GraphPage({ searchParams }: GraphPageProps) {
  const params = await searchParams;
  const initialProjectId = params.project ? Number.parseInt(params.project, 10) : null;
  const graph = buildProjectGraph(1600);

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(15,98,254,0.18),transparent_24%),radial-gradient(circle_at_78%_14%,rgba(249,115,22,0.18),transparent_24%),radial-gradient(circle_at_52%_82%,rgba(16,185,129,0.12),transparent_22%)] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(143,210,255,0.16),transparent_22%),radial-gradient(circle_at_78%_14%,rgba(251,146,60,0.14),transparent_20%),radial-gradient(circle_at_52%_82%,rgba(52,211,153,0.08),transparent_18%)]" />
        <div className="absolute left-[8%] top-[8%] h-64 w-64 rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-400/10" />
        <div className="absolute right-[10%] top-[14%] h-72 w-72 rounded-full bg-orange-200/14 blur-3xl dark:bg-orange-300/10" />
        <div className="absolute bottom-[8%] left-[42%] h-64 w-64 rounded-full bg-emerald-200/10 blur-3xl dark:bg-emerald-300/10" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <div className="surface-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground">
              <Orbit className="h-4 w-4 text-primary" />
              `/graph`
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-6">
        <section className="mb-8 surface-panel rounded-[2rem] p-7 md:p-9">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
            项目关系网图谱
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-muted-foreground md:text-base">
            这里不是按时间顺序翻 Star 列表，而是按“这些项目解决什么问题、适合什么场景、彼此为什么相关”重新组织你的收藏。
            当项目量达到几百上千时，这比单纯的列表更容易帮你重新发现有价值的工具。
          </p>
        </section>

        <ProjectNetworkGraph graph={graph} initialProjectId={initialProjectId} />
      </main>
    </div>
  );
}
