import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsByTopicSlug } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByTopicSlug(slug);

  if (!result) {
    return {
      title: '技术标签页面不存在',
      robots: { index: false, follow: false },
    };
  }

  const title = `${result.bucket.name} 开源项目合集与使用说明`;
  const description = `整理 ${result.bucket.count} 个与 ${result.bucket.name} 相关的 GitHub Star 项目，便于快速查看用途、安装方式、适用场景和详情内容。`;

  return {
    title,
    description,
    alternates: { canonical: `/topics/${result.bucket.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/topics/${result.bucket.slug}`,
    },
  };
}

export default async function TopicCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getProjectsByTopicSlug(slug);

  if (!result) {
    notFound();
  }

  const title = `${result.bucket.name} 开源项目合集`;
  const description = `这里聚合了 ${result.bucket.count} 个与 ${result.bucket.name} 相关的开源项目，适合快速判断哪些工具值得继续深入。`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}/topics/${result.bucket.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '技术标签', item: `${SITE_URL}/topics` },
        { '@type': 'ListItem', position: 3, name: title, item: `${SITE_URL}/topics/${result.bucket.slug}` },
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
      canonicalPath={`/topics/${result.bucket.slug}`}
      jsonLd={jsonLd}
      relatedLinks={[
        { href: '/topics', label: '全部技术标签' },
        { href: '/languages', label: '全部编程语言' },
      ]}
    />
  );
}
