'use client';

import { Activity, AlertCircle, CheckCircle2, LoaderCircle, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  apiKeys: {
    total: number;
    active: number;
    available: number;
  };
  currentTask: {
    full_name: string;
  } | null;
}

interface HealthApiResponse {
  success: boolean;
  message: string;
  data?: HealthData;
}

export function QueueStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const payload = await response.json() as HealthApiResponse;
        if (payload.success && payload.data) {
          setHealth(payload.data);
        }
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <Card className="surface-panel shadow-none">
        <CardContent className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = health.queue.pending + health.queue.processing + health.queue.completed + health.queue.failed;
  const progress = total > 0 ? (health.queue.completed / total) * 100 : 0;
  const tone =
    health.status === 'healthy'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : health.status === 'degraded'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-red-500/10 text-red-700 dark:text-red-300';

  return (
    <Card className="surface-panel shadow-none">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="surface-chip mt-0.5 rounded-full p-2">
            <Radar className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">运行状态</span>
              <Badge className={cn('rounded-full shadow-none', tone)}>{health.status}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {health.currentTask
                ? `当前处理: ${health.currentTask.full_name}`
                : '当前没有正在执行的任务'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:min-w-[420px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Queue</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-500" />
                处理中 {health.queue.processing}
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                已完成 {health.queue.completed}
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                待处理 {health.queue.pending}
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                已跳过 {health.queue.skipped}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              <Activity className="h-3.5 w-3.5" />
              Key {health.apiKeys.available}/{health.apiKeys.total}
            </Badge>
            <Button asChild variant="ghost" className="rounded-full">
              <a href="/api/health" target="_blank" rel="noreferrer">
                详情
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
