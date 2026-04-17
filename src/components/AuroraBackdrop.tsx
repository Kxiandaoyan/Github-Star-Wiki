export function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* 细腻网格点阵（近景） */}
      <div
        className="grid-backdrop absolute inset-0 opacity-60"
        style={{
          maskImage:
            'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 30%, black 20%, transparent 75%)',
        }}
      />

      {/* Aurora 远景光带 */}
      <div
        className="aurora-layer"
        style={{
          background:
            'radial-gradient(60% 60% at 20% 30%, rgba(15, 98, 254, 0.55) 0%, transparent 60%),' +
            'radial-gradient(50% 60% at 80% 25%, rgba(249, 115, 22, 0.55) 0%, transparent 60%)',
        }}
      />
      <div
        className="aurora-layer aurora-layer-2"
        style={{
          background:
            'radial-gradient(55% 55% at 70% 80%, rgba(16, 185, 129, 0.45) 0%, transparent 60%),' +
            'radial-gradient(45% 55% at 30% 85%, rgba(251, 191, 36, 0.45) 0%, transparent 60%)',
        }}
      />

      {/* 顶部轻高光 */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5" />
    </div>
  );
}
