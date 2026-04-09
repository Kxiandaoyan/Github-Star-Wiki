import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/components/seo/CollectionPage';
import { getProjectsByTopicSlug, getTopicBuckets } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateStaticParams() {
  return getTopicBuckets(200).map((bucket) => ({
    slug: bucket.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getProjectsByTopicSlug(slug);

  if (!result) {
    return {
      title: '标签合集不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${result.bucket.name} 开源项目合集与使用说明`;
  const description = `整理 ${result.bucket.count} 个与 ${result.bucket.name} 相关的 GitHub Star 项目，方便查看用途、安装方式、适用场景和详情页内容。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/topics/${result.bucket.slug}`,
    },
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
  const description = `这里聚合了 ${result.bucket.count} 个与 ${result.bucket.name} 相关的开源项目，适合快速判断有哪些工具值得继续深入。`;

  const faq = [
    {
      question: `${result.bucket.name} 标签页会收录什么项目？`,
      answer: `会收录 GitHub 仓库 topics 中包含 ${result.bucket.name} 的项目，并按站内已有 Star 数据进行展示。`,
    },
    {
      question: '我能在这里看到哪些信息？',
      answer: '可以先看一句话简介和基础信息，再跳转到项目详情页查看完整中文介绍、Wiki 章节和思维导图。',
    },
    {
      question: '为什么 topic 聚合页值得做？',
      answer: '因为这种页面天然围绕单一技术主题组织内容，既方便人浏览，也方便搜索引擎理解页面主旨。',
    },
  ];

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
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Topics', item: `${SITE_URL}/topics/${result.bucket.slug}` },
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
      canonicalPath={`/topics/${result.bucket.slug}`}
      jsonLd={jsonLd}
      faq={faq}
      relatedLinks={[
        { href: '/topics', label: '全部标签入口' },
        { href: '/languages', label: '全部语言入口' },
      ]}
    />
  );
}
