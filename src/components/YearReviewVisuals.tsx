import type { MonthlyBucket } from '@/lib/year-review';
import { cn } from '@/lib/utils';

const MONTH_SHORT = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function lighten(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
      : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MonthlyBarChart({ buckets }: { buckets: MonthlyBucket[] }) {
  const maxValue = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-1.5 md:gap-2">
        {buckets.map((bucket, index) => {
          const { count, dominantClusterColor, dominantClusterLabel } = bucket;
          const pct = (count / maxValue) * 100;
          const isPeak = count === maxValue && count > 0;
          const baseColor = dominantClusterColor || '#0f62fe';
          const gradient = count > 0
            ? `linear-gradient(to top, ${lighten(baseColor, 0.95)} 0%, ${lighten(baseColor, 0.55)} 100%)`
            : undefined;

          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="relative flex h-32 w-full items-end rounded-lg bg-muted/30 md:h-40">
                <div
                  className={cn(
                    'w-full rounded-lg transition-all duration-300',
                    count === 0 && 'bg-muted/40',
                    isPeak && 'ring-2 ring-offset-2 ring-offset-background'
                  )}
                  style={{
                    height: `${Math.max(4, pct)}%`,
                    background: gradient,
                    boxShadow: isPeak ? `0 8px 24px ${lighten(baseColor, 0.3)}` : undefined,
                    ['--tw-ring-color' as string]: isPeak ? lighten(baseColor, 0.4) : undefined,
                  }}
                  title={
                    count > 0
                      ? `${MONTH_SHORT[index]}：${count} 次 Star${dominantClusterLabel ? ` · 主要是 ${dominantClusterLabel}` : ''}`
                      : `${MONTH_SHORT[index]}：无 Star`
                  }
                />
                {count > 0 ? (
                  <span className="absolute inset-x-0 -top-5 text-center text-[11px] font-medium text-foreground">
                    {count}
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  'text-[11px] tracking-tight',
                  isPeak ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {MONTH_SHORT[index]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 图例：活跃月份 + 主题配色说明 */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>柱子颜色代表当月主要方向：</span>
        {Array.from(
          new Map(
            buckets
              .filter((b) => b.dominantClusterId && b.dominantClusterColor && b.count > 0)
              .map((b) => [b.dominantClusterId!, b])
          ).values()
        )
          .slice(0, 6)
          .map((bucket) => (
            <span
              key={bucket.dominantClusterId}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2 py-0.5"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: bucket.dominantClusterColor || '#0f62fe' }}
              />
              {bucket.dominantClusterLabel}
            </span>
          ))}
      </div>
    </div>
  );
}

export function ShareList({ items }: { items: Array<{ label: string; count: number; share: number; hint?: string }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="font-medium">{item.label}</span>
              {item.hint ? (
                <span className="text-xs text-muted-foreground">{item.hint}</span>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.count} · {Math.round(item.share * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-amber-400"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ClusterList({
  items,
}: {
  items: Array<{ id: string; label: string; color: string; count: number; share: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium">{item.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {item.count} · {Math.round(item.share * 100)}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: `linear-gradient(90deg, ${item.color}, ${item.color}aa)`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
