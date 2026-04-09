'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  TestTubeDiagonal,
  WandSparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
}

interface SeoStats {
  indexableCount: number;
  seoTitleCount: number;
  seoDescriptionCount: number;
  readyButMissingSeoCount: number;
  titleIssueCount: number;
  descriptionIssueCount: number;
  mindMapCount: number;
}

interface QualityStats {
  averageScore: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  missingInstallCount: number;
  missingUsageCount: number;
  missingProblemCount: number;
}

interface SeoIssueProject {
  id: number;
  full_name: string;
  titleIssue: string | null;
  descriptionIssue: string | null;
}

interface QualityIssueProject {
  id: number;
  full_name: string;
  score: number;
  issues: string[];
}

interface PipelineItem {
  id: number;
  projectId: number;
  fullName: string;
  taskType: string;
  status: string;
  errorMessage: string | null;
  scanReady: boolean;
  analysisReady: boolean;
  deepReadReady: boolean;
  semanticReady: boolean;
  analysisSummary: string | null;
  recommendedFiles: string[];
  reasoningSummary: string | null;
}

interface RecentProject {
  id: number;
  full_name: string;
  one_line_status: string;
  intro_status: string;
  wiki_status: string;
  synced_at: string | null;
}

function getTaskTypeLabel(taskType: string) {
  switch (taskType) {
    case 'scan_repo':
      return '扫描仓库';
    case 'analyze_repo':
      return '分析仓库';
    case 'deep_read_repo':
      return '深读关键文件';
    case 'generate_profile':
      return '生成项目内容';
    default:
      return taskType;
  }
}

function getTaskStatusTone(status: string) {
  switch (status) {
    case 'processing':
      return 'text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-300';
    case 'failed':
      return 'text-red-700 bg-red-500/10 border-red-500/20 dark:text-red-300';
    case 'pending':
      return 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-300';
    default:
      return 'text-muted-foreground bg-muted/30 border-border';
  }
}

export function AdminActions({
  queue,
  projectCount,
  wikiReadyCount,
  seoStats,
  qualityStats,
  seoIssues,
  qualityIssues,
  pipelineItems,
  recentProjects,
}: {
  queue: QueueStats;
  projectCount: number;
  wikiReadyCount: number;
  seoStats: SeoStats;
  qualityStats: QualityStats;
  seoIssues: SeoIssueProject[];
  qualityIssues: QualityIssueProject[];
  pipelineItems: PipelineItem[];
  recentProjects: RecentProject[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function runAction(url: string, label: string) {
    setMessage('');
    setError('');

    startTransition(async () => {
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      const detailMessage = typeof data?.data?.detailMessage === 'string' ? data.data.detailMessage : '';
      const nextMessage = [data.message, detailMessage].filter(Boolean).join('\n');
      if (!response.ok) {
        setError(nextMessage || `${label}失败。`);
        return;
      }

      setMessage(nextMessage || `${label}已触发。`);
      router.refresh();
      return;
    });
  }

  function logout() {
    startTransition(async () => {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    });
  }

  return (
    <div className="space-y-6">
      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            onClick={() => runAction('/api/admin/projects/regenerate-all', '全量重写')}
            disabled={isPending}
            className="w-full rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            一键重写全部项目说明
          </Button>

          <Button
            type="button"
            onClick={() => runAction('/api/sync', '同步 GitHub Star')}
            disabled={isPending}
            variant="outline"
            className="w-full rounded-2xl"
          >
            <RefreshCw className="h-4 w-4" />
            立即同步 GitHub Star
          </Button>

          <Button
            type="button"
            onClick={() => runAction('/api/admin/semantic/rebuild', '回填语义缓存')}
            disabled={isPending}
            variant="outline"
            className="w-full rounded-2xl"
          >
            <Sparkles className="h-4 w-4" />
            回填语义缓存
          </Button>

          <Button
            type="button"
            onClick={() => runAction('/api/admin/model/test', '测试模型连接')}
            disabled={isPending}
            variant="outline"
            className="w-full rounded-2xl"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTubeDiagonal className="h-4 w-4" />}
            测试当前模型连接
          </Button>

          <Button
            type="button"
            onClick={logout}
            disabled={isPending}
            variant="ghost"
            className="w-full rounded-2xl"
          >
            <LogOut className="h-4 w-4" />
            退出后台
          </Button>

          {message ? (
            <p className="whitespace-pre-wrap rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="whitespace-pre-wrap rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>状态概览</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Metric label="项目总数" value={projectCount} />
          <Metric label="已生成 Wiki" value={wikiReadyCount} />
          <Metric label="待处理任务" value={queue.pending} />
          <Metric label="处理中任务" value={queue.processing} />
          <Metric label="累计完成任务" value={queue.completed} />
          <Metric label="累计失败任务" value={queue.failed} />
          <Metric label="累计跳过任务" value={queue.skipped} />
        </CardContent>
      </Card>

      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>生成过程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipelineItems.length > 0 ? (
            pipelineItems.map((item) => (
              <div key={item.id} className="surface-chip rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/projects/${item.projectId}`} className="truncate text-sm font-medium text-foreground hover:text-primary">
                      {item.fullName}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${getTaskStatusTone(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {getTaskTypeLabel(item.taskType)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <StageFlag label="扫描" done={item.scanReady} />
                      <StageFlag label="分析" done={item.analysisReady} />
                      <StageFlag label="深读" done={item.deepReadReady} />
                      <StageFlag label="语义" done={item.semanticReady} />
                    </div>
                    {item.analysisSummary ? (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.analysisSummary}</p>
                    ) : null}
                    {item.reasoningSummary ? (
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.reasoningSummary}</p>
                    ) : null}
                    {item.recommendedFiles.length > 0 ? (
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        关键文件：{item.recommendedFiles.join('、')}
                      </p>
                    ) : null}
                    {item.errorMessage ? (
                      <p className="mt-2 text-xs leading-6 text-destructive">{item.errorMessage}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => runAction(`/api/admin/projects/${item.projectId}/regenerate`, '单项目重写')}
                    disabled={isPending}
                  >
                    <Sparkles className="h-4 w-4" />
                    重写
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              当前没有进行中的多阶段生成任务。
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>内容质量</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="平均质量分" value={qualityStats.averageScore} />
            <Metric label="高质量项目" value={qualityStats.highQualityCount} />
            <Metric label="中质量项目" value={qualityStats.mediumQualityCount} />
            <Metric label="低质量项目" value={qualityStats.lowQualityCount} />
            <Metric label="缺少安装信息" value={qualityStats.missingInstallCount} />
            <Metric label="缺少使用方法" value={qualityStats.missingUsageCount} />
            <Metric label="缺少问题定义" value={qualityStats.missingProblemCount} />
          </div>

          {qualityIssues.length > 0 ? (
            <div className="space-y-3">
              {qualityIssues.map((project) => (
                <div key={project.id} className="surface-chip rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/projects/${project.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary">
                        {project.full_name}
                      </Link>
                      <p className="mt-2 text-sm text-muted-foreground">质量分：{project.score}</p>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {project.issues.map((issue) => (
                          <p key={issue}>{issue}</p>
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => runAction(`/api/admin/projects/${project.id}/regenerate`, '单项目重写')}
                      disabled={isPending}
                    >
                      <Sparkles className="h-4 w-4" />
                      重写
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              当前没有明显的正文质量短板。
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>SEO 质检</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="可索引项目" value={seoStats.indexableCount} />
            <Metric label="已生成 SEO 标题" value={seoStats.seoTitleCount} />
            <Metric label="已生成 SEO 描述" value={seoStats.seoDescriptionCount} />
            <Metric label="待补 SEO" value={seoStats.readyButMissingSeoCount} />
            <Metric label="标题待修复" value={seoStats.titleIssueCount} />
            <Metric label="描述待修复" value={seoStats.descriptionIssueCount} />
            <Metric label="已生成思维导图" value={seoStats.mindMapCount} />
          </div>

          {seoIssues.length > 0 ? (
            <div className="space-y-3">
              {seoIssues.map((project) => (
                <div key={project.id} className="surface-chip rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/projects/${project.id}`} className="truncate text-sm font-medium text-foreground hover:text-primary">
                        {project.full_name}
                      </Link>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {project.titleIssue ? <p>标题问题：{project.titleIssue}</p> : null}
                        {project.descriptionIssue ? <p>描述问题：{project.descriptionIssue}</p> : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => runAction(`/api/admin/projects/${project.id}/regenerate`, '单项目重写')}
                      disabled={isPending}
                    >
                      <Sparkles className="h-4 w-4" />
                      重写
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              当前没有发现明显的 SEO 标题或描述质量问题。
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-panel rounded-[1.8rem] shadow-none">
        <CardHeader>
          <CardTitle>最近项目</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentProjects.map((project) => (
            <div key={project.id} className="surface-chip rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{project.full_name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    one-line {project.one_line_status} / intro {project.intro_status} / wiki {project.wiki_status}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => runAction(`/api/admin/projects/${project.id}/regenerate`, '单项目重写')}
                  disabled={isPending}
                >
                  <Sparkles className="h-4 w-4" />
                  重写
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(queue.failed > 0 || queue.skipped > 0) ? (
        <Card className="surface-panel rounded-[1.8rem] shadow-none">
          <CardHeader>
            <CardTitle>队列提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            {queue.failed > 0 ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
                <div className="inline-flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  当前有 {queue.failed} 个失败任务，建议优先检查 API Key、模型响应或仓库上下文质量。
                </div>
              </div>
            ) : null}
            {queue.skipped > 0 ? (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-800 dark:text-sky-200">
                当前有 {queue.skipped} 个跳过任务，通常表示内容已生成完整，或仓库上下文不足，不需要重复消耗 token。
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-chip rounded-2xl px-4 py-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StageFlag({ label, done }: { label: string; done: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <LoaderCircle className="h-3.5 w-3.5 text-muted-foreground" />}
      {label}
    </span>
  );
}
