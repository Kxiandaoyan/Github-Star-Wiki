'use client';

import Link from 'next/link';
import { ArrowUpRight, LoaderCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  stars: number;
  language: string | null;
  one_line_status: string;
  className?: string;
}

const languageColors: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-amber-400',
  Python: 'bg-emerald-500',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  'C++': 'bg-pink-500',
  Ruby: 'bg-rose-500',
  PHP: 'bg-violet-500',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-fuchsia-500',
  default: 'bg-slate-400',
};

function formatStars(stars: number) {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }

  return String(stars);
}

export function ProjectCard({
  id,
  full_name,
  description,
  one_line_intro,
  stars,
  language,
  one_line_status,
  className,
}: ProjectCardProps) {
  const [owner, name] = full_name.split('/');
  const languageColor = languageColors[language || ''] || languageColors.default;
  const isGenerated = one_line_status === 'completed' && !!one_line_intro;
  const isGenerating = one_line_status === 'generating';

  return (
    <Link href={`/projects/${id}`} className="block h-full">
      <Card
        className={cn(
          'surface-panel card-hover h-full rounded-[1.6rem] shadow-none',
          className
        )}
      >
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="secondary" className="rounded-full text-[11px] uppercase tracking-[0.2em]">
                {owner}
              </Badge>
              <CardTitle className="mt-3 truncate text-xl">{name}</CardTitle>
            </div>
            <div className="surface-chip rounded-full p-2 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-[110px]">
          {isGenerated ? (
            <p className="line-clamp-3 text-sm leading-7 text-foreground/80">{one_line_intro}</p>
          ) : isGenerating ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              正在生成 AI 简介
            </div>
          ) : (
            <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
              {description || '暂无项目描述，等待生成更完整的中文介绍。'}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-foreground">{formatStars(stars)}</span>
            </span>

            {language ? (
              <span className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', languageColor)} />
                {language}
              </span>
            ) : null}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
