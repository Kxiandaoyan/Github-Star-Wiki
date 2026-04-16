import Link from 'next/link';
import { ArrowUp, Github, Heart, Rss } from 'lucide-react';

const footerLinks = [
  {
    title: '浏览方式',
    items: [
      { label: '最新同步项目', href: '/' },
      { label: '项目关系网图谱', href: '/graph' },
      { label: '自动专题', href: '/collections' },
      { label: '使用场景', href: '/use-cases' },
    ],
  },
  {
    title: '按维度',
    items: [
      { label: '按语言', href: '/languages' },
      { label: '按技术标签', href: '/topics' },
      { label: '按项目类型', href: '/types' },
    ],
  },
  {
    title: '管理',
    items: [
      { label: '后台登录', href: '/admin' },
      { label: 'RSS 订阅', href: '/feed.xml' },
      { label: 'Sitemap', href: '/sitemap.xml' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border/50 bg-background/40">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              Star Wiki
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              把 GitHub Star 列表整理成可搜索、可筛选、可快速判断的项目库，帮你真正重新找回那些收藏过的好项目。
            </p>
            <div className="flex items-center gap-3 pt-1 text-muted-foreground">
              <a
                href="/feed.xml"
                className="inline-flex items-center gap-1 text-xs hover:text-foreground"
                aria-label="RSS 订阅"
              >
                <Rss className="h-3.5 w-3.5" />
                RSS
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title} className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-5 text-xs text-muted-foreground">
          <span>为 GitHub Star 检索而做 · 使用 Next.js 16 构建</span>
          <a
            href="#top"
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label="返回顶部"
          >
            返回顶部
            <ArrowUp className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
