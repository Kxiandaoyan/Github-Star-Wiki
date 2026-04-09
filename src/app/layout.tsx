import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Star Wiki',
  title: {
    default: 'Star Wiki',
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
  ],
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: 'Star Wiki',
    title: 'Star Wiki',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="paper-noise antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
