'use client';

import { Search, Star, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchProject {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
}

const RECENT_KEY = 'star-wiki:cmdk-recent';
const MAX_RECENT = 6;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  const current = loadRecent();
  const next = [query, ...current.filter((item) => item !== query)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchProject[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=1`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        const projects: SearchProject[] = payload?.data?.projects || [];
        setResults(projects.slice(0, 8));
        setActiveIndex(0);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const goToProject = useCallback(
    (project: SearchProject) => {
      saveRecent(query.trim());
      setOpen(false);
      router.push(`/projects/${project.id}`);
    },
    [router, query]
  );

  const submitQuery = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      saveRecent(value);
      setOpen(false);
      router.push(`/?q=${encodeURIComponent(value)}`);
    },
    [router]
  );

  const onKeyInside = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results.length > 0) {
        goToProject(results[activeIndex]);
      } else {
        submitQuery(query);
      }
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label="打开全局搜索（Cmd + K）"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2.5 text-sm text-muted-foreground shadow-lg backdrop-blur-md hover:text-foreground md:inline-flex"
      >
        <Search className="h-4 w-4" />
        全局搜索
        <kbd className="ml-1 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyInside}
            placeholder="搜索项目、简介、标签… 回车跳转首页搜索，↑↓ 选项目，Enter 打开"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="p-3">
              {recent.length > 0 ? (
                <>
                  <div className="px-2 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    最近搜索
                  </div>
                  <div className="space-y-1">
                    {recent.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        <span className="flex items-center gap-2">
                          <Search className="h-3.5 w-3.5 text-muted-foreground" />
                          {item}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Sparkles className="mx-auto h-5 w-5 text-primary/70" />
                  <p className="mt-3">开始输入以在站内搜索项目</p>
                  <p className="mt-1 text-xs">按 Enter 使用首页搜索，↑↓ 选中一个项目直接打开</p>
                </div>
              )}
            </div>
          ) : results.length > 0 ? (
            <ul className="p-1">
              {results.map((project, index) => (
                <li key={project.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToProject(project)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="truncate">{project.full_name}</span>
                      </div>
                      {project.one_line_intro || project.description ? (
                        <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                          {project.one_line_intro || project.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-500" />
                      {project.stars.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => submitQuery(query)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60"
                >
                  <span>在首页查看所有结果</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </li>
            </ul>
          ) : loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">搜索中…</div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              没有找到匹配项目，按 Enter 使用首页完整搜索
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
