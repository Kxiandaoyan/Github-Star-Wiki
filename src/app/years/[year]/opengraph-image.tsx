import { ImageResponse } from 'next/og';
import { buildYearReview } from '@/lib/year-review';

export const runtime = 'nodejs';
export const alt = '年度 Star 回顾';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function YearOgImage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: rawYear } = await params;
  const year = Number.parseInt(rawYear, 10);
  const review = Number.isFinite(year) ? buildYearReview(year) : null;

  const total = review?.total ?? 0;
  const peak = review?.peakMonthLabel ?? '';
  const topCluster = review?.clusterBuckets[0]?.label ?? '';
  const topLanguage = review?.languageBuckets[0]?.name ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0c1220 0%, #1c1f35 60%, #3d2617 100%)',
          color: '#fff',
          fontFamily: '"PingFang SC", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            ⭐
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 16,
                letterSpacing: 4,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
              }}
            >
              Star Wiki · Year in Review
            </div>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>
              按年份回看你的 GitHub Star
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 220,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -10,
              background: 'linear-gradient(135deg, #fcd34d 0%, #fb923c 45%, #f87171 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {year}
          </div>
          <div
            style={{
              fontSize: 36,
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.4,
              maxWidth: 1000,
            }}
          >
            {total > 0 ? `这一年 Star 了 ${total} 个项目` : '这一年还没有 Star 记录'}
            {topCluster ? ` · 最多是 ${topCluster}` : ''}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 22,
          }}
        >
          {peak ? (
            <div
              style={{
                padding: '10px 18px',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.88)',
              }}
            >
              🔥 {peak}最活跃
            </div>
          ) : null}
          {topLanguage ? (
            <div
              style={{
                padding: '10px 18px',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.88)',
              }}
            >
              ⚡ {topLanguage}
            </div>
          ) : null}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 18,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').host}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
