import { cn } from '@/lib/utils';

const MONTH_SHORT = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function MonthlyBarChart({ data }: { data: number[] }) {
  const maxValue = Math.max(1, ...data);

  return (
    <div className="grid grid-cols-12 gap-1.5 md:gap-2">
      {data.map((count, index) => {
        const pct = (count / maxValue) * 100;
        const isPeak = count === maxValue && count > 0;
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="relative flex h-32 w-full items-end rounded-lg bg-muted/30 md:h-40">
              <div
                className={cn(
                  'w-full rounded-lg transition-all',
                  isPeak
                    ? 'bg-gradient-to-t from-amber-500 via-orange-500 to-red-500 shadow-lg shadow-amber-500/20'
                    : count > 0
                      ? 'bg-gradient-to-t from-primary/60 to-primary/25'
                      : 'bg-muted/40'
                )}
                style={{ height: `${Math.max(4, pct)}%` }}
                title={`${MONTH_SHORT[index]}：${count} 次 Star`}
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
