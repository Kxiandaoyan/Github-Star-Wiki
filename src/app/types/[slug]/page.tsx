import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectTypeBuckets, getProjectsByProjectTypeSlug } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateStaticParams() {
  return getProjectTypeBuckets(100).map((bucket) => ({
    slug: bucket.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByProjectTypeSlug(slug);

  if (!result) {
    return {
      title: '项目类型页不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${result.bucket.title}与使用说明`;
  const description = `整理 ${result.bucket.count} 个属于“${result.bucket.name}”类型的 GitHub Star 项目，方便快速判断用途、适用场景与继续阅读顺序。`;

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
  const faq = [
    {
      question: `${result.bucket.name} 类型页会收录什么项目？`,
      answer: `会收录站内已识别为“${result.bucket.name}”的项目，适合从项目形态而不是技术栈重新整理收藏。`,
    },
    {
      question: '为什么按项目类型聚合有价值？',
      answer: '因为很多时候用户真正关心的不是仓库用了什么语言，而是它是应用、库、CLI、模板还是文档资源。',
    },
  ];

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
        { href: '/types', label: '全部项目类型入口' },
        { href: '/use-cases', label: '全部使用场景入口' },
        { href: '/collections', label: '全部专题入口' },
      ]}
    />
  );
}
