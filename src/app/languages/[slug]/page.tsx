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
      title: '语言合集不存在',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${result.bucket.name} 开源项目合集与使用指南`;
  const description = `整理 ${result.bucket.count} 个 ${result.bucket.name} 相关 GitHub Star 项目，方便查看用途、安装方式、使用场景和站内详情页。`;

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

  const faq = [
    {
      question: `${result.bucket.name} 项目合集适合看什么？`,
      answer: `适合快速浏览 ${result.bucket.name} 技术栈下的 GitHub Star 项目，判断每个项目的用途、适用场景和是否值得继续深入。`,
    },
    {
      question: '这个页面的项目数据从哪里来？',
      answer: '项目来自站内同步的 GitHub Star 仓库列表，中文内容则基于仓库 README、目录结构和关键文件自动整理。',
    },
    {
      question: '为什么这个聚合页适合 SEO？',
      answer: '因为它围绕单一语言主题形成稳定聚合，内容结构清晰，且每个项目都可以继续跳转到独立详情页。',
    },
  ];

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
        { '@type': 'ListItem', position: 2, name: '语言聚合', item: `${SITE_URL}/languages/${result.bucket.slug}` },
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
      canonicalPath={`/languages/${result.bucket.slug}`}
      jsonLd={jsonLd}
      faq={faq}
      relatedLinks={[
        { href: '/languages', label: '全部语言入口' },
        { href: '/topics', label: '全部标签入口' },
      ]}
    />
  );
}
