'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

const HIDDEN_STYLE: CSSProperties = {
  position: 'fixed',
  left: '-9999px',
  top: '-9999px',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: 0,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
  color: 'transparent',
  background: 'transparent',
  fontSize: 0,
  lineHeight: 0,
};

const VISIBLE_STYLE: CSSProperties = {
  position: 'fixed',
  left: '1rem',
  top: '1rem',
  zIndex: 200,
  padding: '0.625rem 1rem',
  background: 'var(--primary)',
  color: 'var(--primary-foreground)',
  borderRadius: '0.625rem',
  boxShadow: 'var(--elev-2)',
  fontSize: '0.875rem',
  lineHeight: 1.2,
  fontWeight: 500,
  textDecoration: 'none',
  outline: '2px solid rgba(249, 115, 22, 0.4)',
  outlineOffset: '2px',
  whiteSpace: 'nowrap',
};

/**
 * 无障碍跳过链接。
 * - 默认完全不可见（位置 -9999px + clip + font-size 0）
 * - 仅在键盘 Tab 聚焦时滑出到左上角
 * - 使用 React 内联 style，不受任何全局 CSS 污染或 Tailwind 编译问题影响
 */
export function SkipToMain() {
  const [focused, setFocused] = useState(false);

  return (
    <a
      href="#main-content"
      style={focused ? VISIBLE_STYLE : HIDDEN_STYLE}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="跳到主要内容"
    >
      跳到主要内容
    </a>
  );
}
