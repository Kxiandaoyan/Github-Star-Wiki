'use client';

import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const toggle = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    const doc = document as ViewTransitionDocument;

    // 不支持 View Transitions 或用户请求减少动画 → 直接切换
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!doc.startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    const button = buttonRef.current;
    const rect = button?.getBoundingClientRect();
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    const radius = Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY)
    );

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme);
    });

    await transition.ready;

    const animation = document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${originX}px ${originY}px)`,
          `circle(${radius}px at ${originX}px ${originY}px)`,
        ],
      },
      {
        duration: 480,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      }
    );

    animation.onfinish = () => {};
  };

  return (
    <Button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label="切换主题"
      variant="outline"
      size="icon"
      className={cn('surface-button h-11 w-11 rounded-2xl')}
    >
      <SunMedium className="hidden h-5 w-5 text-amber-400 dark:block" />
      <Moon className="h-5 w-5 text-emerald-700 dark:hidden dark:text-emerald-300" />
    </Button>
  );
}
