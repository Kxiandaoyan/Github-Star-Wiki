'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  defaultValue?: string;
}

const PLACEHOLDER_SUGGESTIONS = [
  '搜索仓库、简介、技术栈或主题…',
  '试试 "ai agent"、"mcp" 或 "claude code"',
  '搜 "next.js starter" 找一套全栈模板',
  '搜 "rag" 看看知识库问答项目',
  '搜 "terminal" 看终端相关工具',
  '搜索中文介绍、用途、解决的问题',
];

export function SearchBar({ className, defaultValue = '' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % PLACEHOLDER_SUGGESTIONS.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const applySearch = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    const nextValue = value.trim();

    if (nextValue) {
      params.set('q', nextValue);
    } else {
      params.delete('q');
    }

    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  return (
    <form
      className={cn('flex items-center gap-2', className)}
      onSubmit={(event) => {
        event.preventDefault();
        applySearch(query);
      }}
    >
      <div className="search-ring relative flex-1 rounded-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={query ? '' : PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
          className="surface-input h-12 rounded-xl border-0 pl-11 pr-24 shadow-none"
        />
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border/60 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex"
          aria-hidden="true"
          title="按 ⌘K 打开全局搜索"
        >
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </div>

      {query ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="surface-button h-12 w-12 rounded-xl"
          onClick={() => {
            setQuery('');
            applySearch('');
            inputRef.current?.focus();
          }}
          aria-label="清空搜索"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}

      <Button type="submit" className="h-12 rounded-xl px-5">
        搜索
      </Button>
    </form>
  );
}
