'use client';

import { useEffect, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || 'light') : 'light';
  const isDark = currentTheme === 'dark';

  return (
    <Button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      variant="outline"
      size="icon"
      className={cn('surface-button h-11 w-11 rounded-2xl')}
    >
      {mounted ? (
        isDark ? <SunMedium className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
      ) : (
        <span className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
