import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  withHome?: boolean;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function Breadcrumbs({ items, className, withHome = true }: BreadcrumbsProps) {
  const entries: BreadcrumbItem[] = withHome
    ? [{ label: '首页', href: '/' }, ...items]
    : items;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="面包屑导航"
        className={cn(
          'flex flex-wrap items-center gap-1 text-sm text-muted-foreground',
          className
        )}
      >
        {entries.map((item, index) => {
          const isLast = index === entries.length - 1;
          const content = (
            <span className="inline-flex items-center gap-1">
              {index === 0 && withHome ? <Home className="h-3.5 w-3.5" /> : null}
              {item.label}
            </span>
          );

          return (
            <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded px-1.5 py-1 transition-colors hover:text-foreground"
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={cn('px-1.5 py-1', isLast && 'font-medium text-foreground')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {content}
                </span>
              )}
              {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" /> : null}
            </span>
          );
        })}
      </nav>
    </>
  );
}
