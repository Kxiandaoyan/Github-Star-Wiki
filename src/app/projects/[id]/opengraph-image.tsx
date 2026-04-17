import { ImageResponse } from 'next/og';
import { getProjectById } from '@/lib/github';

export const runtime = 'nodejs';
export const alt = '项目介绍卡片';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function truncate(value: string, max: number) {
  if (!value) return '';
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

export default async function ProjectOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProjectById(Number.parseInt(id, 10));

  const title = project?.full_name || 'Unknown project';
  const description =
    project?.seo_description
    || project?.one_line_intro
    || project?.description
    || '这个项目还没有生成简介。';
  const stars = project?.stars ?? 0;
  const language = project?.language || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background:
            'linear-gradient(135deg, #fefaf3 0%, #fff5e4 50%, #fff0db 100%)',
          color: '#111827',
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: '#fff',
              border: '1px solid rgba(17,24,39,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⭐
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 14, letterSpacing: 3, color: '#6b7280', textTransform: 'uppercase' }}>
              Star Wiki
            </div>
            <div style={{ fontSize: 18, color: '#1f2937' }}>AI 生成的中文项目介绍</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: '#0f172a',
            }}
          >
            {truncate(title, 44)}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.5,
              color: '#475569',
            }}
          >
            {truncate(description, 110)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: '#334155' }}>
          <div
            style={{
              padding: '10px 20px',
              border: '1px solid rgba(17,24,39,0.08)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.75)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⭐ {stars.toLocaleString('en-US')}
          </div>
          {language ? (
            <div
              style={{
                padding: '10px 20px',
                border: '1px solid rgba(17,24,39,0.08)',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.75)',
              }}
            >
              {language}
            </div>
          ) : null}
          <div style={{ marginLeft: 'auto', fontSize: 20, color: '#94a3b8' }}>
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
