import type { CSSProperties } from 'react';

const codeSnippets = [
  { text: 'const repos = await stars.sync()', top: '10%', left: '8%', delay: '0s', duration: '18s' },
  { text: 'SELECT * FROM projects WHERE language = ?', top: '18%', left: '52%', delay: '2s', duration: '22s' },
  { text: 'func Search(q string) []Project {', top: '34%', left: '12%', delay: '5s', duration: '20s' },
  { text: 'search(q, chinese_intro)', top: '46%', left: '56%', delay: '1s', duration: '24s' },
  { text: 'repos.filter((repo) => repo.topics.includes("ai"))', top: '62%', left: '18%', delay: '4s', duration: '21s' },
  { text: 'starred_at DESC LIMIT 21', top: '70%', left: '60%', delay: '3s', duration: '19s' },
  { text: 'projects_fts MATCH "workflow"', top: '14%', left: '28%', delay: '6s', duration: '23s' },
  { text: 'if repo.oneLineIntro != "" { return true }', top: '24%', left: '72%', delay: '7s', duration: '17s' },
  { text: 'python search.py --lang ts --query agent', top: '38%', left: '34%', delay: '8s', duration: '26s' },
  { text: 'return wikiDocuments.slice(0, 6)', top: '54%', left: '68%', delay: '2.5s', duration: '18s' },
  { text: 'const score = fuse.search(keyword)', top: '66%', left: '38%', delay: '5.5s', duration: '22s' },
  { text: '<ProjectCard repo={repo} />', top: '78%', left: '10%', delay: '1.5s', duration: '20s' },
];

export function HeroCodeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_82%_26%,rgba(249,115,22,0.08),transparent_26%)]" />
      <div className="absolute inset-y-6 right-8 w-px bg-gradient-to-b from-transparent via-amber-300/25 to-transparent dark:via-amber-200/15" />
      <div className="absolute inset-y-10 left-[42%] w-px bg-gradient-to-b from-transparent via-emerald-300/20 to-transparent dark:via-emerald-200/15" />

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
