import type { MetadataRoute } from 'next';
import db from '@/lib/db';
import { getSitemapTaxonomies } from '@/lib/taxonomy';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const projectRows = db.prepare(`
    SELECT id, updated_at
    FROM projects
    WHERE seo_title IS NOT NULL
       OR intro_status = 'completed'
       OR wiki_status = 'completed'
    ORDER BY updated_at DESC
  `).all() as Array<{ id: number; updated_at: string | null }>;

  const { languages, topics, specialCollections, projectTypes, useCases } = getSitemapTaxonomies();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/languages`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/collections`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/graph`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.76,
    },
    {
      url: `${SITE_URL}/types`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.82,
    },
    {
      url: `${SITE_URL}/use-cases`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.82,
    },
  ];

  const projectRoutes = projectRows.map((project) => ({
    url: `${SITE_URL}/projects/${project.id}`,
    lastModified: project.updated_at ? new Date(project.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const languageRoutes = languages.map((bucket) => ({
    url: `${SITE_URL}/languages/${bucket.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const topicRoutes = topics.map((bucket) => ({
    url: `${SITE_URL}/topics/${bucket.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const specialCollectionRoutes = specialCollections.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const projectTypeRoutes = projectTypes.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.78,
  }));

  const useCaseRoutes = useCases.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.78,
  }));

  return [
    ...staticRoutes,
    ...projectRoutes,
    ...languageRoutes,
    ...topicRoutes,
    ...specialCollectionRoutes,
    ...projectTypeRoutes,
    ...useCaseRoutes,
  ];
}
