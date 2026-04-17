import Link from 'next/link';
import { ArrowLeft, Menu, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/Breadcrumbs';
import { cn } from '@/lib/utils';

interface SiteHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  className?: string;
  rightSlot?: ReactNode;
  /**
   * 是否 sticky。默认为 true（大多数内页）。首页有自己的 header，不使用此组件。
   */
  sticky?: boolean;
}

export function SiteHeader({
  breadcrumbs,
  backHref = '/',
  backLabel = '返回首页',
  className,
  rightSlot,
  sticky = true,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'border-b border-border/60 bg-background/70 backdrop-blur-xl',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={backHref}
            className="surface-chip inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>

          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="hidden min-w-0 md:block">
              <Breadcrumbs items={breadcrumbs} className="whitespace-nowrap overflow-hidden" />
            </div>
          ) : null}

          <Link
            href="/"
            className="ml-auto flex items-center gap-2 md:ml-0 md:hidden"
            aria-label="Star Wiki 首页"
          >
            <div className="surface-chip flex h-8 w-8 items-center justify-center rounded-full">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300" />
            </div>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {rightSlot}
          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            <NavLink href="/graph">图谱</NavLink>
            <NavLink href="/collections">专题</NavLink>
            <NavLink href="/use-cases">场景</NavLink>
            <NavLink href="/years">年度</NavLink>
            <NavLink href="/languages">语言</NavLink>
          </nav>
          <ThemeToggle />
          <MobileNavMenu />
        </div>
      </div>

      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className="border-t border-border/40 px-4 py-2 md:hidden md:px-6">
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs items={breadcrumbs} className="text-xs" />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function MobileNavMenu() {
  return (
    <details className="relative md:hidden">
      <summary
        className="surface-chip flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-muted-foreground [&::-webkit-details-marker]:hidden"
        aria-label="展开导航"
      >
        <Menu className="h-4 w-4" />
      </summary>
      <div className="surface-panel absolute right-0 top-full z-40 mt-2 w-44 rounded-xl p-2 shadow-xl">
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/graph">
          图谱
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/collections">
          专题
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/use-cases">
          场景
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/years">
          年度回顾
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/languages">
          语言
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/topics">
          标签
        </Link>
        <Link className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted" href="/types">
          类型
        </Link>
      </div>
    </details>
  );
}
