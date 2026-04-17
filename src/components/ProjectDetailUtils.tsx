'use client';

import { Check, Copy, ListTree, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}${url}`
      : url;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // user cancelled; fall back to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: prompt
      window.prompt('复制链接：', shareUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
        copied ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground hover:text-foreground'
      )}
      aria-label="分享该项目"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '分享'}
    </button>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const target = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('复制链接：', target);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '复制链接'}
    </button>
  );
}

interface TocItem {
  id: string;
  title: string;
}

export function StickyTOC({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;

    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-96px 0px -60% 0px',
        threshold: 0.1,
      }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="章节导航"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.4rem] border border-border/50 bg-background/40 p-4 text-sm backdrop-blur-md xl:block"
    >
      <div className="mb-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <ListTree className="h-3.5 w-3.5 text-primary" />
        本页目录
      </div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block rounded-lg border-l-2 px-3 py-1.5 text-sm leading-5 transition-colors',
                activeId === item.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <span className="mr-2 text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
