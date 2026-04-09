'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Language {
  language: string;
  count: number;
}

interface LanguageFilterProps {
  languages: Language[];
  activeLanguage: string | null;
  className?: string;
}

export function LanguageFilter({ languages, activeLanguage, className }: LanguageFilterProps) {
  const router = useRouter();
  const displayLanguages = languages.slice(0, 12);

  const handleFilter = (language: string | null) => {
    const params = new URLSearchParams(window.location.search);

    if (language) {
      params.set('lang', language);
    } else {
      params.delete('lang');
    }

    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button
        type="button"
        variant={!activeLanguage ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => handleFilter(null)}
      >
        全部
      </Button>

      {displayLanguages.map((lang) => (
        <Button
          key={lang.language}
          type="button"
          variant={activeLanguage === lang.language ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => handleFilter(lang.language)}
        >
          {lang.language}
          <span className="text-xs opacity-70">{lang.count}</span>
        </Button>
      ))}
    </div>
  );
}
