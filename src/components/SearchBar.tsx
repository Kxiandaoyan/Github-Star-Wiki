'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  defaultValue?: string;
}

export function SearchBar({ className, defaultValue = '' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

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
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索仓库、简介、技术栈或主题"
          className="surface-input h-12 rounded-xl pl-11 shadow-none"
        />
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
          }}
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
