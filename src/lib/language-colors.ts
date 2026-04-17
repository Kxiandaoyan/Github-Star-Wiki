/**
 * GitHub Linguist 风格语言色卡
 * 参考 https://github.com/ozh/github-colors 的颜色映射，
 * 用 Tailwind 工具类以保证 light/dark 模式都有效果。
 * 未列出的语言统一 fallback 到 slate。
 */
export const LANGUAGE_COLORS: Record<string, { dot: string; hex: string }> = {
  // === Top 10 常见语言 ===
  TypeScript: { dot: 'bg-[#3178c6]', hex: '#3178c6' },
  JavaScript: { dot: 'bg-[#f1e05a]', hex: '#f1e05a' },
  Python: { dot: 'bg-[#3572A5]', hex: '#3572A5' },
  Go: { dot: 'bg-[#00ADD8]', hex: '#00ADD8' },
  Rust: { dot: 'bg-[#dea584]', hex: '#dea584' },
  Java: { dot: 'bg-[#b07219]', hex: '#b07219' },
  C: { dot: 'bg-[#555555]', hex: '#555555' },
  'C++': { dot: 'bg-[#f34b7d]', hex: '#f34b7d' },
  'C#': { dot: 'bg-[#178600]', hex: '#178600' },
  PHP: { dot: 'bg-[#4F5D95]', hex: '#4F5D95' },

  // === JVM & JS 生态 ===
  Kotlin: { dot: 'bg-[#A97BFF]', hex: '#A97BFF' },
  Swift: { dot: 'bg-[#F05138]', hex: '#F05138' },
  'Objective-C': { dot: 'bg-[#438eff]', hex: '#438eff' },
  Scala: { dot: 'bg-[#c22d40]', hex: '#c22d40' },
  Groovy: { dot: 'bg-[#4298b8]', hex: '#4298b8' },
  Clojure: { dot: 'bg-[#db5855]', hex: '#db5855' },
  Dart: { dot: 'bg-[#00B4AB]', hex: '#00B4AB' },

  // === 脚本 / 动态 ===
  Ruby: { dot: 'bg-[#701516]', hex: '#701516' },
  Lua: { dot: 'bg-[#000080]', hex: '#000080' },
  Perl: { dot: 'bg-[#0298c3]', hex: '#0298c3' },
  R: { dot: 'bg-[#198CE7]', hex: '#198CE7' },
  Elixir: { dot: 'bg-[#6e4a7e]', hex: '#6e4a7e' },
  Erlang: { dot: 'bg-[#B83998]', hex: '#B83998' },

  // === 系统 / 底层 ===
  Zig: { dot: 'bg-[#ec915c]', hex: '#ec915c' },
  Nim: { dot: 'bg-[#ffc200]', hex: '#ffc200' },
  Crystal: { dot: 'bg-[#000100]', hex: '#000100' },
  'F#': { dot: 'bg-[#b845fc]', hex: '#b845fc' },
  Haskell: { dot: 'bg-[#5e5086]', hex: '#5e5086' },
  OCaml: { dot: 'bg-[#3be133]', hex: '#3be133' },

  // === Web / Styling ===
  HTML: { dot: 'bg-[#e34c26]', hex: '#e34c26' },
  CSS: { dot: 'bg-[#563d7c]', hex: '#563d7c' },
  SCSS: { dot: 'bg-[#c6538c]', hex: '#c6538c' },
  Less: { dot: 'bg-[#1d365d]', hex: '#1d365d' },
  Sass: { dot: 'bg-[#a53b70]', hex: '#a53b70' },
  Svelte: { dot: 'bg-[#ff3e00]', hex: '#ff3e00' },
  Vue: { dot: 'bg-[#41b883]', hex: '#41b883' },
  Astro: { dot: 'bg-[#ff5a03]', hex: '#ff5a03' },

  // === Shell / Infra ===
  Shell: { dot: 'bg-[#89e051]', hex: '#89e051' },
  PowerShell: { dot: 'bg-[#012456]', hex: '#012456' },
  Dockerfile: { dot: 'bg-[#384d54]', hex: '#384d54' },
  HCL: { dot: 'bg-[#844FBA]', hex: '#844FBA' },
  Makefile: { dot: 'bg-[#427819]', hex: '#427819' },
  Nix: { dot: 'bg-[#7e7eff]', hex: '#7e7eff' },

  // === Web3 / 区块链 ===
  Solidity: { dot: 'bg-[#AA6746]', hex: '#AA6746' },
  Move: { dot: 'bg-[#4a137a]', hex: '#4a137a' },

  // === ML / 数据 ===
  'Jupyter Notebook': { dot: 'bg-[#DA5B0B]', hex: '#DA5B0B' },
  MATLAB: { dot: 'bg-[#e16737]', hex: '#e16737' },
  Julia: { dot: 'bg-[#a270ba]', hex: '#a270ba' },

  // === 数据库 / 查询 ===
  PLSQL: { dot: 'bg-[#dad8d8]', hex: '#dad8d8' },
  'PL/SQL': { dot: 'bg-[#dad8d8]', hex: '#dad8d8' },
  SQLPL: { dot: 'bg-[#c6d5c1]', hex: '#c6d5c1' },
  TSQL: { dot: 'bg-[#e38c00]', hex: '#e38c00' },

  // === 其他 ===
  Assembly: { dot: 'bg-[#6E4C13]', hex: '#6E4C13' },
  Vim: { dot: 'bg-[#199f4b]', hex: '#199f4b' },
  'Vim Script': { dot: 'bg-[#199f4b]', hex: '#199f4b' },
  Lisp: { dot: 'bg-[#3fb68b]', hex: '#3fb68b' },
  CoffeeScript: { dot: 'bg-[#244776]', hex: '#244776' },
  TeX: { dot: 'bg-[#3D6117]', hex: '#3D6117' },
  Markdown: { dot: 'bg-[#083fa1]', hex: '#083fa1' },
  MDX: { dot: 'bg-[#fcb32c]', hex: '#fcb32c' },
};

export function getLanguageColor(language: string | null | undefined): {
  dot: string;
  hex: string;
} {
  if (!language) return { dot: 'bg-slate-400', hex: '#94a3b8' };
  return LANGUAGE_COLORS[language] || { dot: 'bg-slate-400', hex: '#94a3b8' };
}
