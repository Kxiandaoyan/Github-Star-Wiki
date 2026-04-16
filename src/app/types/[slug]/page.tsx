import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsByProjectTypeSlug } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByProjectTypeSlug(slug);

  if (!result) {
    return {
      title: '项目类型页面不存在',
      robots: { index: false, follow: false },
    };
  }

  const title = `${result.bucket.title}与使用说明`;
  const description = `整理 ${result.bucket.count} 个属于“${result.bucket.name}”类型的 GitHub Star 项目，便于快速判断用途、适用场景和阅读顺序。`;

  return {
    title,
    description,
    alternates: { canonical: result.bucket.href },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}${result.bucket.href}`,
    },
  };
}

export default async function ProjectTypeCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getProjectsByProjectTypeSlug(slug);

  if (!result) {
    notFound();
  }

  const title = result.bucket.title;
  const description = result.bucket.description;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}${result.bucket.href}`,
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
      canonicalPath={result.bucket.href}
      jsonLd={jsonLd}
      kind="项目类型"
      parentHref="/types"
      parentLabel="全部类型"
      breadcrumbs={[
        { label: '项目类型', href: '/types' },
        { label: result.bucket.name },
      ]}
      relatedLinks={[
        { href: '/types', label: '全部项目类型' },
        { href: '/use-cases', label: '全部使用场景' },
        { href: '/collections', label: '全部自动专题' },
      ]}
    />
  );
}
