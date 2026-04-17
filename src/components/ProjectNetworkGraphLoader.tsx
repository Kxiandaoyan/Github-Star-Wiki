'use client';

import dynamic from 'next/dynamic';
import type { ProjectGraphData } from '@/lib/project-network';
import { Skeleton } from '@/components/Skeleton';

const ProjectNetworkGraph = dynamic(
  () => import('./ProjectNetworkGraph').then((mod) => mod.ProjectNetworkGraph),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <div className="surface-panel overflow-hidden rounded-[2rem] shadow-none">
          <div className="border-b border-border/60 px-5 py-4">
            <Skeleton className="h-11 w-full rounded-full" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-24 rounded-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-[74vh] min-h-[640px] w-full rounded-none" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-[1.8rem]" />
          <Skeleton className="h-72 w-full rounded-[1.8rem]" />
        </div>
      </div>
    ),
  }
);

export function ProjectNetworkGraphLoader({
  graph,
  initialProjectId,
}: {
  graph: ProjectGraphData;
  initialProjectId?: number | null;
}) {
  return <ProjectNetworkGraph graph={graph} initialProjectId={initialProjectId} />;
}
