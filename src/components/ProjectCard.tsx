import Link from 'next/link';
import { Clock, LoaderCircle, Star } from 'lucide-react';
import { AddToCompareButton } from '@/components/CompareUtils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  updated_at?: string | null;
  current_task_type?: string | null;
  current_task_status?: string | null;
  className?: string;
}

function getHealthBadge(updatedAt: string | null | undefined) {
  if (!updatedAt) return null;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return null;
  const monthsAgo = (Date.now() - ts) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo >= 36) {
    return { label: '3 年未更新', tone: 'danger' as const };
  }
  if (monthsAgo >= 18) {
    return { label: '长期未更新', tone: 'warn' as const };
  }
  return null;
}

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

function formatStars(stars: number) {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }
  return String(stars);
}

function getTaskLabel(taskType: string | null | undefined, taskStatus: string | null | undefined) {
  const prefix = taskStatus === 'processing' ? '正在' : '等待';
  switch (taskType) {
    case 'scan_repo':
      return `${prefix}扫描仓库`;
    case 'analyze_repo':
      return `${prefix}分析仓库`;
    case 'deep_read_repo':
      return `${prefix}深读代码`;
    case 'generate_profile':
      return `${prefix}生成介绍`;
    default:
      return taskStatus === 'processing' ? '正在生成内容' : '等待生成内容';
  }
}

export function ProjectCard({
  id,
  full_name,
  description,
  one_line_intro,
  stars,
  language,
  one_line_status,
  updated_at,
  current_task_type,
  current_task_status,
  className,
}: ProjectCardProps) {
  const [owner, name] = full_name.split('/');
  const languageColor = languageColors[language || ''] || languageColors.default;
  const isGenerated = one_line_status === 'completed' && !!one_line_intro;
  const hasTask = Boolean(current_task_type && current_task_status);
  const isProcessing = current_task_status === 'processing';
  const taskLabel = hasTask ? getTaskLabel(current_task_type, current_task_status) : null;
  const healthBadge = getHealthBadge(updated_at);

  return (
    <Card
      className={cn(
        'surface-panel card-hover group relative h-full overflow-hidden rounded-[1.6rem] shadow-none',
        className
      )}
    >
      {/* 全卡链接覆盖层（只保留 aria-label，不要任何可见文字） */}
      <Link
        href={`/projects/${id}`}
        aria-label={`查看 ${full_name} 详情`}
        className="focus-ring absolute inset-0 z-0 rounded-[1.6rem]"
      />

      <CardHeader className="pointer-events-none relative z-0 space-y-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/90">
            {owner}
          </span>
          {healthBadge ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                healthBadge.tone === 'danger'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
              )}
              title={`最后更新 ${updated_at?.slice(0, 10)}`}
              suppressHydrationWarning
            >
              <Clock className="h-2.5 w-2.5" />
              {healthBadge.label}
            </span>
          ) : null}
        </div>
        <CardTitle className="break-words text-lg font-semibold leading-6 tracking-tight transition-colors group-hover:text-primary">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="pointer-events-none relative z-0 min-h-[88px] pb-4 pt-0">
        {isGenerated ? (
          <p className="line-clamp-3 text-sm leading-6 text-foreground/70">{one_line_intro}</p>
        ) : hasTask && taskLabel ? (
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs',
              isProcessing
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            <LoaderCircle className={cn('h-3.5 w-3.5', isProcessing && 'animate-spin')} />
            {taskLabel}
          </div>
        ) : (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground/80">
            {description || '暂无项目描述，等待生成更完整的中文介绍。'}
          </p>
        )}
      </CardContent>

      <CardFooter className="relative z-0 flex items-center gap-3 border-t border-border/40 bg-muted/10 px-6 py-3">
        <div className="pointer-events-none flex flex-1 items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">{formatStars(stars)}</span>
          </span>
          {language ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', languageColor)} />
              <span>{language}</span>
            </span>
          ) : null}
        </div>
        <div className="pointer-events-auto">
          <AddToCompareButton
            id={id}
            fullName={full_name}
            intro={one_line_intro || description || ''}
            variant="icon"
          />
        </div>
      </CardFooter>
    </Card>
  );
}
