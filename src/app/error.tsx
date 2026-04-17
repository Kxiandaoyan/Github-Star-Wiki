'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(239,68,68,0.16),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.14),transparent_22%)]" />
      </div>

      <main id="main-content" className="w-full max-w-2xl">
        <div className="surface-panel rounded-[2rem] p-8 text-center md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Something went wrong
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl">
            这个页面出了点问题
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            已经在后台记录了这次错误。你可以点"重试"再加载一次，或者回到首页继续浏览。
          </p>

          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              错误追踪码：<span className="select-all">{error.digest}</span>
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              重试
            </button>
            <Link
              href="/"
              className="surface-chip inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
