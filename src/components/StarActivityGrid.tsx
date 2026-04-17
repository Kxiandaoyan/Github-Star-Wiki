import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ActivityCell {
  date: string;
  count: number;
}

interface StarActivityGridProps {
  cells: ActivityCell[];
  recordedCount: number;
  weeks: number;
}

function getLevel(count: number, maxCount: number) {
  if (count === 0 || maxCount === 0) {
    return 0;
  }

  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function formatDate(date: string) {
  const [, month, day] = date.split('-');
  return `${parseInt(month, 10)}月${parseInt(day, 10)}日`;
}

export function StarActivityGrid({ cells, recordedCount, weeks }: StarActivityGridProps) {
  const maxCount = Math.max(...cells.map((cell) => cell.count), 0);
  const totalInRange = cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <Card className="surface-panel rounded-[1.8rem] shadow-none">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Star Activity
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">
              最近 {weeks} 周的 Star 活动
            </h3>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-sm text-muted-foreground">
              区间内记录了 {totalInRange} 次 Star，累计已存储 {recordedCount} 条时间数据
            </div>
            <Link
              href="/years"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              按年度查看回顾
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {recordedCount > 0 ? (
          <div
            className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            suppressHydrationWarning
          >
            <div className="overflow-x-auto" suppressHydrationWarning>
              <div
                className="grid min-w-max grid-flow-col grid-rows-7 gap-1"
                suppressHydrationWarning
              >
                {cells.map((cell) => {
                  const level = getLevel(cell.count, maxCount);

                  return (
                    <div
                      key={cell.date}
                      className={cn(
                        'h-3.5 w-3.5 rounded-[4px] border border-transparent',
                        level === 0 && 'bg-muted/80',
                        level === 1 && 'bg-emerald-100 dark:bg-emerald-950/70',
                        level === 2 && 'bg-emerald-300 dark:bg-emerald-800/80',
                        level === 3 && 'bg-emerald-500 dark:bg-emerald-600/90',
                        level === 4 && 'bg-emerald-700 dark:bg-emerald-400'
                      )}
                      title={`${formatDate(cell.date)} · ${cell.count} 次 Star`}
                      aria-label={`${cell.date}: ${cell.count} starred repositories`}
                      suppressHydrationWarning
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>少</span>
              <LegendCell className="bg-muted/80" />
              <LegendCell className="bg-emerald-100 dark:bg-emerald-950/70" />
              <LegendCell className="bg-emerald-300 dark:bg-emerald-800/80" />
              <LegendCell className="bg-emerald-500 dark:bg-emerald-600/90" />
              <LegendCell className="bg-emerald-700 dark:bg-emerald-400" />
              <span>多</span>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-border bg-muted/30 px-4 py-5 text-sm leading-7 text-muted-foreground">
            当前数据库还没有可用的 Star 时间记录。下一次执行同步后，这里会开始显示按日期聚合的 Star 活动。
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendCell({ className }: { className?: string }) {
  return <span className={cn('h-3.5 w-3.5 rounded-[4px]', className)} aria-hidden="true" />;
}
