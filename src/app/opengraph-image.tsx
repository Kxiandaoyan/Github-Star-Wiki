import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Star Wiki · 重新理解你 Star 过的项目';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
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
          background:
            'linear-gradient(135deg, #fefaf3 0%, #f5efe4 40%, #fff0db 100%)',
          color: '#111827',
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              background: '#fff',
              border: '1px solid rgba(17,24,39,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            ⭐
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 16, letterSpacing: 4, color: '#6b7280', textTransform: 'uppercase' }}>
              Star Wiki
            </div>
            <div style={{ fontSize: 20, color: '#1f2937', marginTop: 2 }}>
              帮你搜索与回看 Star 过的项目
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: '#0f172a',
              maxWidth: 950,
            }}
          >
            重新理解你 Star 过的项目
          </div>
          <div style={{ fontSize: 28, color: '#475569', maxWidth: 900, lineHeight: 1.5 }}>
            搜索、筛选、关系网图谱，带 AI 中文 Wiki
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 20, color: '#64748b' }}>
          <div
            style={{
              padding: '10px 18px',
              border: '1px solid rgba(17,24,39,0.08)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            🌌 语义关系网
          </div>
          <div
            style={{
              padding: '10px 18px',
              border: '1px solid rgba(17,24,39,0.08)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            📚 AI Wiki
          </div>
          <div
            style={{
              padding: '10px 18px',
              border: '1px solid rgba(17,24,39,0.08)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
            }}
          >
            🔍 中文搜索
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
