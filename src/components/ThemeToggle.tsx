'use client';

import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
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
