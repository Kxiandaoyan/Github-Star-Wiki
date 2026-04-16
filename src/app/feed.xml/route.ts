import db from '@/lib/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface FeedRow {
  id: number;
  full_name: string;
  one_line_intro: string | null;
  description: string | null;
  seo_description: string | null;
  stars: number;
  language: string | null;
  synced_at: string | null;
  starred_at: string | null;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(value: string | null) {
  if (!value) return new Date().toUTCString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
}

export async function GET() {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        full_name,
        one_line_intro,
        description,
        seo_description,
        stars,
        language,
        synced_at,
        starred_at
      FROM projects
      WHERE one_line_status = 'completed'
      ORDER BY COALESCE(synced_at, starred_at) DESC
      LIMIT 50
    `
    )
    .all() as FeedRow[];

  const buildDate = new Date().toUTCString();

  const items = rows
    .map((row) => {
      const link = `${SITE_URL}/projects/${row.id}`;
      const summary = row.one_line_intro || row.seo_description || row.description || '';
      const title = `${row.full_name} · ★${row.stars.toLocaleString()}${row.language ? ` · ${row.language}` : ''}`;
      const pubDate = toRfc822(row.synced_at || row.starred_at);
      const descriptionParts = [summary];
      if (row.language) descriptionParts.push(`语言: ${row.language}`);
      if (row.starred_at) descriptionParts.push(`Star 时间: ${row.starred_at.slice(0, 10)}`);

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(descriptionParts.filter(Boolean).join(' · '))}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Star Wiki</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>最新同步的 GitHub Star 项目与中文 Wiki</description>
    <language>zh-CN</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
