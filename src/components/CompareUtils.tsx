'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, GitCompare, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readLocalJSON, writeLocalJSON } from '@/lib/browser-storage';
import { cn } from '@/lib/utils';

const COMPARE_KEY = 'star-wiki:compare-tray';
const MAX_COMPARE = 4;

interface CompareEntry {
  id: number;
  fullName: string;
  intro: string;
}

const EVENT = 'star-wiki:compare-tray:change';

function readEntries(): CompareEntry[] {
  return readLocalJSON<CompareEntry[]>(COMPARE_KEY, []);
}

function saveEntries(entries: CompareEntry[]) {
  writeLocalJSON(COMPARE_KEY, entries);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT));
  }
}

function useCompareEntries() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<CompareEntry[]>([]);

  useEffect(() => {
    setMounted(true);
    setEntries(readEntries());
    const handler = () => setEntries(readEntries());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return { entries, mounted };
}

export function AddToCompareButton({
  id,
  fullName,
  intro,
  variant = 'chip',
}: {
  id: number;
  fullName: string;
  intro: string;
  variant?: 'chip' | 'icon';
}) {
  const { entries, mounted } = useCompareEntries();
  const added = entries.some((e) => e.id === id);
  const full = entries.length >= MAX_COMPARE && !added;

  const toggle = () => {
    const current = readEntries();
    if (current.some((e) => e.id === id)) {
      saveEntries(current.filter((e) => e.id !== id));
      return;
    }
    if (current.length >= MAX_COMPARE) return;
    saveEntries([...current, { id, fullName, intro }]);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={full && !added}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
          mounted && added
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:text-foreground',
          full && !added && 'cursor-not-allowed opacity-50'
        )}
        aria-label={mounted && added ? '从对比中移除' : '加入对比'}
        title={
          mounted && added
            ? '已加入对比列表'
            : full
              ? `对比栏已满（最多 ${MAX_COMPARE} 个）`
              : '加入对比'
        }
        suppressHydrationWarning
      >
        {mounted && added ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={full && !added}
      className={cn(
        'surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
        mounted && added
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground',
        full && !added && 'cursor-not-allowed opacity-50'
      )}
      aria-pressed={added}
      title={
        mounted && added
          ? '已加入对比列表'
          : full
            ? `对比栏已满（最多 ${MAX_COMPARE} 个）`
            : '加入对比'
      }
      suppressHydrationWarning
    >
      {mounted && added ? (
        <>
          <Check className="h-3.5 w-3.5" />
          已加入对比
        </>
      ) : (
        <>
          <GitCompare className="h-3.5 w-3.5" />
          加入对比
        </>
      )}
    </button>
  );
}

export function CompareTray() {
  const { entries, mounted } = useCompareEntries();
  const router = useRouter();

  if (!mounted || entries.length === 0) return null;

  const clearAll = () => saveEntries([]);
  const remove = (id: number) => saveEntries(entries.filter((e) => e.id !== id));
  const goCompare = () => {
    const ids = entries.map((e) => e.id).join(',');
    router.push(`/compare?ids=${ids}`);
  };

  return (
    <div
      role="region"
      aria-label="对比列表"
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-border/70 bg-background/90 p-3 shadow-2xl backdrop-blur-xl md:bottom-6"
    >
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <GitCompare className="h-3.5 w-3.5" />
          对比 {entries.length}/{MAX_COMPARE}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="surface-chip group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs text-foreground"
            >
              <Link
                href={`/projects/${entry.id}`}
                className="max-w-[180px] truncate transition-colors hover:text-primary"
                title={entry.fullName}
              >
                {entry.fullName}
              </Link>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`移除 ${entry.fullName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            清空
          </button>
          <button
            type="button"
            onClick={goCompare}
            disabled={entries.length < 2}
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-opacity',
              entries.length < 2 ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'
            )}
            title={entries.length < 2 ? '至少需要 2 个项目' : '打开对比视图'}
          >
            开始对比
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClearCompareOnMountFromIds({ ids }: { ids: number[] }) {
  useEffect(() => {
    if (ids.length === 0) return;
    // 打开对比页时，同步 tray 为 URL 里的项目
    const current = readEntries();
    const needed = ids.slice(0, MAX_COMPARE);
    const existingById = new Map(current.map((e) => [e.id, e]));
    const merged: CompareEntry[] = needed.map(
      (id) =>
        existingById.get(id) ?? {
          id,
          fullName: `#${id}`,
          intro: '',
        }
    );
    saveEntries(merged);
  }, [ids]);
  return null;
}
