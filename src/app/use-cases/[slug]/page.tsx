import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsByUseCaseSlug, getUseCaseBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateStaticParams() {
  return getUseCaseBuckets(100).map((bucket) => ({
    slug: bucket.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByUseCaseSlug(slug);

  if (!result) {
    return {
      title: '使用场景页不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = result.bucket.title;
  const description = `自动聚合 ${result.bucket.count} 个与“${result.bucket.name}”场景相关的 GitHub Star 项目，帮助用户从真实用途而不是单个技术关键词重新发现项目。`;

  return {
    title,
    description,
    alternates: {
      canonical: result.bucket.href,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}${result.bucket.href}`,
    },
  };
}

export default async function UseCaseCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getProjectsByUseCaseSlug(slug);

  if (!result) {
    notFound();
  }

  const title = result.bucket.title;
  const description = result.bucket.description;
  const faq = result.definition.faq;
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
      canonicalPath={result.bucket.href}
      jsonLd={jsonLd}
      faq={faq}
      relatedLinks={[
        { href: '/use-cases', label: '全部使用场景入口' },
        { href: '/types', label: '全部项目类型入口' },
        { href: '/collections', label: '全部专题入口' },
      ]}
    />
  );
}
