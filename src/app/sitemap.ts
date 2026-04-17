import type { MetadataRoute } from 'next';
import db from '@/lib/db';
import { getSitemapTaxonomies } from '@/lib/taxonomy';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface ProjectSitemapRow {
  id: number;
  updated_at: string | null;
  synced_at: string | null;
  stars: number | null;
  intro_status: string | null;
  wiki_status: string | null;
}

function safeDate(value: string | null | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : fallback;
}

function priorityForStars(stars: number | null): number {
  if (!stars || stars <= 0) return 0.45;
  if (stars >= 10000) return 0.82;
  if (stars >= 3000) return 0.75;
  if (stars >= 500) return 0.68;
  if (stars >= 50) return 0.6;
  return 0.5;
}

function freqForAge(updatedAt: string | null): 'daily' | 'weekly' | 'monthly' | 'yearly' {
  if (!updatedAt) return 'monthly';
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  if (days < 14) return 'daily';
  if (days < 90) return 'weekly';
  if (days < 365) return 'monthly';
  return 'yearly';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const projectRows = db.prepare(`
    SELECT id, updated_at, synced_at, stars, intro_status, wiki_status
    FROM projects
    WHERE seo_title IS NOT NULL
       OR intro_status = 'completed'
       OR wiki_status = 'completed'
    ORDER BY updated_at DESC
  `).all() as ProjectSitemapRow[];

  const latestProjectUpdate = projectRows.reduce<Date>((latest, project) => {
    const candidate = safeDate(project.updated_at || project.synced_at, latest);
    return candidate > latest ? candidate : latest;
  }, new Date(0));
  const freshness = latestProjectUpdate.getTime() > 0 ? latestProjectUpdate : new Date();

  const { languages, topics, specialCollections, projectTypes, useCases } = getSitemapTaxonomies();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: freshness,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/graph`,
      lastModified: freshness,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/collections`,
      lastModified: freshness,
      changeFrequency: 'daily',
      priority: 0.88,
    },
    {
      url: `${SITE_URL}/use-cases`,
      lastModified: freshness,
      changeFrequency: 'daily',
      priority: 0.86,
    },
    {
      url: `${SITE_URL}/types`,
      lastModified: freshness,
      changeFrequency: 'weekly',
      priority: 0.82,
    },
    {
      url: `${SITE_URL}/languages`,
      lastModified: freshness,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: freshness,
      changeFrequency: 'weekly',
      priority: 0.78,
    },
  ];

  const projectRoutes = projectRows.map((project) => ({
    url: `${SITE_URL}/projects/${project.id}`,
    lastModified: safeDate(project.updated_at || project.synced_at),
    changeFrequency: freqForAge(project.updated_at) as
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'yearly',
    priority: priorityForStars(project.stars),
  }));

  const languageRoutes = languages.map((bucket) => ({
    url: `${SITE_URL}/languages/${bucket.slug}`,
    lastModified: freshness,
    changeFrequency: 'weekly' as const,
    priority: 0.66,
  }));

  const topicRoutes = topics.map((bucket) => ({
    url: `${SITE_URL}/topics/${bucket.slug}`,
    lastModified: freshness,
    changeFrequency: 'weekly' as const,
    priority: bucket.count >= 20 ? 0.7 : 0.55,
  }));

  const specialCollectionRoutes = specialCollections.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: freshness,
    changeFrequency: 'weekly' as const,
    priority: 0.76,
  }));

  const projectTypeRoutes = projectTypes.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: freshness,
    changeFrequency: 'weekly' as const,
    priority: 0.72,
  }));

  const useCaseRoutes = useCases.map((bucket) => ({
    url: `${SITE_URL}${bucket.href}`,
    lastModified: freshness,
    changeFrequency: 'weekly' as const,
    priority: 0.74,
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
