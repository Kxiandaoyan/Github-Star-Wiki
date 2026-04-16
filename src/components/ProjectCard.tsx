import Link from 'next/link';
import { ArrowUpRight, Clock, LoaderCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    return { label: '3 年未更新', className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' };
  }
  if (monthsAgo >= 18) {
    return { label: '长期未更新', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' };
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
    <Link href={`/projects/${id}`} className="focus-ring block h-full">
      <Card
        className={cn(
          'surface-panel card-hover group h-full rounded-[1.6rem] shadow-none',
          className
        )}
      >
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="secondary" className="rounded-full text-[11px] uppercase tracking-[0.2em]">
                {owner}
              </Badge>
              <CardTitle className="mt-3 truncate text-xl transition-colors group-hover:text-primary">
                {name}
              </CardTitle>
            </div>
            <div className="surface-chip rounded-full p-2 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-[110px]">
          {isGenerated ? (
            <p className="line-clamp-3 text-sm leading-7 text-foreground/80">{one_line_intro}</p>
          ) : hasTask && taskLabel ? (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm',
                isProcessing
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              )}
            >
              <LoaderCircle className={cn('h-4 w-4', isProcessing ? 'animate-spin' : '')} />
              {taskLabel}
            </div>
          ) : (
            <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
              {description || '暂无项目描述，等待生成更完整的中文介绍。'}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-foreground">{formatStars(stars)}</span>
            </span>

            {language ? (
              <span className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', languageColor)} />
                {language}
              </span>
            ) : null}

            {healthBadge ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                  healthBadge.className
                )}
                title={`最后更新 ${updated_at?.slice(0, 10)}`}
                suppressHydrationWarning
              >
                <Clock className="h-3 w-3" />
                {healthBadge.label}
              </span>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
