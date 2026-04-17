import type { Metadata } from 'next';
import './globals.css';
import { CommandPalette } from '@/components/CommandPalette';
import { CompareTray } from '@/components/CompareUtils';
import { BackToTop, ReadingProgressBar } from '@/components/ReadingUtils';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { ThemeProvider } from '@/components/ThemeProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Star Wiki',
  title: {
    default: 'Star Wiki · 帮你搜索与回看 Star 过的 GitHub 项目',
    template: '%s | Star Wiki',
  },
  description: '聚合并整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 项目简介与 Wiki 卡片浏览。',
  keywords: [
    'GitHub Star',
    'GitHub 项目搜索',
    '项目知识库',
    'Wiki 卡片',
    'Next.js',
    'AI Wiki',
    '项目聚合',
    'MCP',
    'AI Agent',
  ],
  category: 'technology',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: 'Star Wiki',
    title: 'Star Wiki · 帮你搜索与回看 Star 过的 GitHub 项目',
    description: '聚合并整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 项目简介与 Wiki 卡片浏览。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Star Wiki',
    description: '聚合并整理你的 GitHub Star 项目，支持中文搜索、语言筛选、AI 项目简介与 Wiki 卡片浏览。',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Star Wiki',
  url: SITE_URL,
  logo: `${SITE_URL}/next.svg`,
  description: '帮你把 GitHub Star 列表整理成可搜索、可筛选、可快速判断的项目库。',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Star Wiki',
  url: SITE_URL,
  inLanguage: 'zh-CN',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const siteNavigationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SiteNavigationElement',
  name: ['首页', '项目关系网图谱', '自动专题', '使用场景', '编程语言', '技术标签', '项目类型'],
  url: [
    `${SITE_URL}/`,
    `${SITE_URL}/graph`,
    `${SITE_URL}/collections`,
    `${SITE_URL}/use-cases`,
    `${SITE_URL}/languages`,
    `${SITE_URL}/topics`,
    `${SITE_URL}/types`,
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://avatars.githubusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://github.com" />
      </head>
      <body className="paper-noise antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          跳到主要内容
        </a>
        <ThemeProvider>
          <ReadingProgressBar />
          {children}
          <BackToTop />
          <CommandPalette />
          <CompareTray />
          <ShortcutsHelp />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationJsonLd) }}
        />
      </body>
    </html>
  );
}
