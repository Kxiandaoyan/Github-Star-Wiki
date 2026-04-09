import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsBySpecialCollectionSlug, getSpecialCollectionBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateStaticParams() {
  return getSpecialCollectionBuckets(100).map((bucket) => ({
    slug: bucket.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsBySpecialCollectionSlug(slug);

  if (!result) {
    return {
      title: '专题页不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = result.bucket.title;
  const description = `自动聚合 ${result.bucket.count} 个与“${result.bucket.name}”主题相关的 GitHub Star 项目，帮助你从用途、场景与使用方式重新整理收藏过的开源项目。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/collections/${result.bucket.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/collections/${result.bucket.slug}`,
    },
  };
}

export default async function SpecialCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getProjectsBySpecialCollectionSlug(slug);

  if (!result) {
    notFound();
  }

  const title = result.bucket.title;
  const description = result.bucket.description;
  const faq = result.definition.faq;
  const relatedLinks = getSpecialCollectionBuckets(20)
    .filter((item) => item.slug !== result.bucket.slug)
    .slice(0, 3)
    .map((item) => ({
      href: item.href,
      label: item.title,
    }));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}/collections/${result.bucket.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/collections` },
        { '@type': 'ListItem', position: 3, name: title, item: `${SITE_URL}/collections/${result.bucket.slug}` },
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
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <CollectionPage
      title={title}
      description={description}
      bucket={result.bucket}
      projects={result.projects}
      canonicalPath={`/collections/${result.bucket.slug}`}
      jsonLd={jsonLd}
      faq={faq}
      relatedLinks={[
        { href: '/collections', label: '全部专题入口' },
        { href: '/languages', label: '全部语言入口' },
        { href: '/topics', label: '全部标签入口' },
        ...relatedLinks,
      ]}
    />
  );
}
