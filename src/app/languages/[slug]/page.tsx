import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsByLanguageSlug } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByLanguageSlug(slug);

  if (!result) {
    return {
      title: '编程语言页面不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${result.bucket.name} 开源项目合集与使用指南`;
  const description = `整理 ${result.bucket.count} 个 ${result.bucket.name} 相关 GitHub Star 项目，方便查看用途、安装方式、使用场景和站内详情页内容。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/languages/${result.bucket.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/languages/${result.bucket.slug}`,
    },
  };
}

export default async function LanguageCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getProjectsByLanguageSlug(slug);

  if (!result) {
    notFound();
  }

  const title = `${result.bucket.name} 开源项目合集`;
  const description = `这里整理了 ${result.bucket.count} 个 ${result.bucket.name} 开源项目，适合用来快速筛选、理解和继续深入查看详情。`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}/languages/${result.bucket.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '编程语言', item: `${SITE_URL}/languages` },
        { '@type': 'ListItem', position: 3, name: title, item: `${SITE_URL}/languages/${result.bucket.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: result.projects.slice(0, 20).map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/projects/${project.id}`,
        name: project.full_name,
      })),
    },
  ];

  return (
    <CollectionPage
      title={title}
      description={description}
      bucket={result.bucket}
      projects={result.projects}
      canonicalPath={`/languages/${result.bucket.slug}`}
      jsonLd={jsonLd}
      relatedLinks={[
        { href: '/languages', label: '全部编程语言' },
        { href: '/topics', label: '全部技术标签' },
      ]}
    />
  );
}
