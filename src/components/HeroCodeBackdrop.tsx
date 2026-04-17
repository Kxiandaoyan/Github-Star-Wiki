import type { CSSProperties } from 'react';
import { AuroraBackdrop } from './AuroraBackdrop';

const codeSnippets = [
  { text: 'stars.sync()', top: '12%', left: '8%', delay: '0s', duration: '22s' },
  { text: 'projects_fts MATCH', top: '20%', left: '72%', delay: '3s', duration: '26s' },
  { text: 'semantic.cluster', top: '64%', left: '14%', delay: '5s', duration: '24s' },
  { text: 'relatedProjects()', top: '72%', left: '68%', delay: '2s', duration: '20s' },
];

export function HeroCodeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <AuroraBackdrop />

      {/* 垂直装饰线 */}
      <div className="absolute inset-y-10 right-10 w-px bg-gradient-to-b from-transparent via-amber-300/20 to-transparent dark:via-amber-200/10" />
      <div className="absolute inset-y-14 left-[42%] w-px bg-gradient-to-b from-transparent via-emerald-300/15 to-transparent dark:via-emerald-200/10" />

      {/* 少量漂浮代码片段（克制版） */}
      {codeSnippets.map((snippet) => (
        <span
          key={snippet.text}
          className="hero-code-item"
          style={{
            top: snippet.top,
            left: snippet.left,
            ['--drift-delay' as string]: snippet.delay,
            ['--drift-duration' as string]: snippet.duration,
          } as CSSProperties}
        >
          {snippet.text}
        </span>
      ))}
    </div>
  );
}
