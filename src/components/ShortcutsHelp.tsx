'use client';

import { Keyboard, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['⌘', 'K'], label: '打开全局搜索' },
  { keys: ['/'], label: '聚焦搜索框' },
  { keys: ['g', 'h'], label: '前往首页' },
  { keys: ['g', 'g'], label: '前往项目关系网图谱' },
  { keys: ['g', 'c'], label: '前往自动专题页' },
  { keys: ['g', 'u'], label: '前往使用场景' },
  { keys: ['g', 'l'], label: '前往编程语言' },
  { keys: ['g', 't'], label: '前往技术标签' },
  { keys: ['g', 'a'], label: '前往后台' },
  { keys: ['?'], label: '显示 / 隐藏这个面板' },
  { keys: ['Esc'], label: '关闭弹层' },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const isTyping = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKey = (event: KeyboardEvent) => {
      // 允许 ? 和 Esc 在输入框外触发
      if (event.key === 'Escape') {
        setOpen(false);
        pendingG = false;
        return;
      }

      if (isTyping(event)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '?') {
        event.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (event.key === '/') {
        const search = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="搜索"]'
        );
        if (search) {
          event.preventDefault();
          search.focus();
        }
        return;
      }

      if (event.key === 'g') {
        pendingG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          pendingG = false;
        }, 1200);
        return;
      }

      if (pendingG) {
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        const routes: Record<string, string> = {
          h: '/',
          g: '/graph',
          c: '/collections',
          u: '/use-cases',
          l: '/languages',
          t: '/topics',
          a: '/admin',
        };
        const target = routes[event.key];
        if (target) {
          event.preventDefault();
          router.push(target);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [router]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <Keyboard className="h-4 w-4 text-primary" />
            键盘快捷键
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="divide-y divide-border/40 px-2 py-1">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-4 px-3 py-2 text-sm text-foreground"
            >
              <span>{shortcut.label}</span>
              <span className="inline-flex items-center gap-1">
                {shortcut.keys.map((k, index) => (
                  <span key={index} className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                      {k}
                    </kbd>
                    {index < shortcut.keys.length - 1 ? (
                      <span className="text-xs text-muted-foreground">然后</span>
                    ) : null}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-border/40 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          提示：按 <kbd className="rounded bg-muted px-1 text-foreground">?</kbd> 随时打开此面板；
          输入框聚焦时快捷键会被忽略。
        </div>
      </div>
    </div>
  );
}
