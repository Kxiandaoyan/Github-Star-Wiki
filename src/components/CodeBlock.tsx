'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = 'typescript', filename }: CodeBlockProps) {
  const { theme } = useTheme();
  const style = theme === 'dark' ? vscDarkPlus : vs;

  return (
    <div className="rounded-lg overflow-hidden border border-neutral-800">
      {filename && (
        <div className="bg-neutral-800 dark:bg-neutral-800 light:bg-neutral-200 text-neutral-400 dark:text-neutral-400 light:text-neutral-600 text-sm px-4 py-2 border-b border-neutral-700 dark:border-neutral-700 light:border-neutral-300">
          📄 {filename}
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={style}
        customStyle={{
          margin: 0,
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
