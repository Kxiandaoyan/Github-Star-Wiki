'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function AdminLoginForm({ reason }: { reason?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(reason === 'not-configured' ? '后台账号密码尚未在环境变量中配置。' : '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    startTransition(async () => {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || '登录失败。');
        return;
      }

      window.location.href = '/admin';
    });
  }

  return (
    <Card className="surface-panel rounded-[1.8rem] shadow-none">
      <CardHeader>
        <div className="surface-chip flex h-12 w-12 items-center justify-center rounded-2xl text-primary">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl">后台登录</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-username">
              用户名
            </label>
            <Input
              id="admin-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="surface-input rounded-2xl border-border/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-password">
              密码
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="surface-input rounded-2xl border-border/60"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            登录后台
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
