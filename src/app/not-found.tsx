import Link from 'next/link';
import {
  ArrowLeft,
  Compass,
  Home,
  Layers3,
  Orbit,
  Search,
  SearchX,
  Sparkles,
} from 'lucide-react';

export const metadata = {
  title: '页面不存在',
  robots: {
    index: false,
    follow: true,
  },
};

const suggestions = [
  { href: '/', label: '首页', icon: Home, description: '查看最近同步的项目' },
  { href: '/graph', label: '项目关系网图谱', icon: Orbit, description: '按用途和功能重新发现项目' },
  { href: '/collections', label: '自动专题', icon: Layers3, description: '按主题浏览聚合页面' },
  { href: '/use-cases', label: '使用场景', icon: Compass, description: '按真实任务找项目' },
];

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(15,98,254,0.18),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.16),transparent_22%),radial-gradient(circle_at_52%_82%,rgba(16,185,129,0.12),transparent_24%)]" />
      </div>

      <main id="main-content" className="w-full max-w-3xl">
        <div className="surface-panel rounded-[2rem] p-8 text-center md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-background/60">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            404 · Not Found
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            这里没有你要找的页面
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            它可能还没有同步到库里、已经从收藏中移除，或者链接被改动过。你可以从下面几个入口重新开始，也可以直接按{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">⌘K</kbd>
            {' '}全站搜索。
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <Link
              href="/?q="
              className="surface-chip inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-foreground hover:text-primary"
            >
              <Search className="h-4 w-4" />
              搜索项目
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {suggestions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface-panel group flex items-start gap-3 rounded-[1.4rem] p-4 transition-colors hover:border-primary/30"
            >
              <div className="surface-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-primary">
                  {item.label}
                  <Sparkles className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
