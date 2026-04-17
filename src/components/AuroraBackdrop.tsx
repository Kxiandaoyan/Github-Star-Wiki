export function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* 细腻网格点阵（近景） */}
      <div
        className="grid-backdrop absolute inset-0 opacity-50"
        style={{
          maskImage:
            'radial-gradient(ellipse at 50% 30%, black 25%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 30%, black 25%, transparent 75%)',
        }}
      />

      {/* Aurora 远景光带 - 更饱和可见 */}
      <div
        className="aurora-layer"
        style={{
          background:
            'radial-gradient(60% 60% at 18% 28%, rgba(15, 98, 254, 0.75) 0%, transparent 60%),' +
            'radial-gradient(55% 60% at 82% 22%, rgba(249, 115, 22, 0.75) 0%, transparent 60%)',
        }}
      />
      <div
        className="aurora-layer aurora-layer-2"
        style={{
          background:
            'radial-gradient(60% 55% at 72% 82%, rgba(16, 185, 129, 0.65) 0%, transparent 60%),' +
            'radial-gradient(50% 60% at 28% 88%, rgba(251, 191, 36, 0.65) 0%, transparent 60%)',
        }}
      />

      {/* 顶部轻高光 */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/40 to-transparent dark:from-white/8" />
    </div>
  );
}
