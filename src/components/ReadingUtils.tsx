'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.max(0, Math.min(1, window.scrollY / docHeight));
      setProgress(scrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary via-amber-400 to-orange-500 transition-transform duration-150"
      style={{ transform: `scaleX(${progress})` }}
      aria-hidden="true"
    />
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-5 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:text-foreground md:bottom-24 md:right-6"
      aria-label="返回顶部"
      title="返回顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
