'use client';

import { useEffect, useState, useTransition } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import type { AdminSettingItem, SettingCategory } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SettingsByCategory = Record<SettingCategory, AdminSettingItem[]>;

const CATEGORY_TITLES: Record<SettingCategory, string> = {
  github: 'GitHub 配置',
  llm: '模型配置',
  queue: '队列与调度',
  site: '站点配置',
  storage: '存储预留项',
  prompts: '提示词',
};

function buildValueMap(settings: SettingsByCategory) {
  return Object.values(settings).flat().reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.key] = item.value;
    return accumulator;
  }, {});
}

export function AdminSettingsForm({
  initialSettings,
  onSaved,
}: {
  initialSettings: SettingsByCategory;
  onSaved: (settings: SettingsByCategory) => void;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [values, setValues] = useState<Record<string, string>>(buildValueMap(initialSettings));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSettings(initialSettings);
    setValues(buildValueMap(initialSettings));
  }, [initialSettings]);

  function updateValue(key: string, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    startTransition(async () => {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: values }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || '保存配置失败。');
        return;
      }

      const nextSettings = data.data?.settings as SettingsByCategory;
      setSettings(nextSettings);
      setValues(buildValueMap(nextSettings));
      onSaved(nextSettings);
      setMessage(data.message || '配置已保存，并已重新加载运行时设置。');
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">运行配置与提示词</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            所有可配置项都可以在这里查看和修改。保存后，模型 Key、队列并发和定时任务都会按新配置运行。
          </p>
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-amber-400 text-amber-950 hover:bg-amber-300"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存全部配置
        </Button>
      </div>

      {message ? (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {Object.entries(settings).map(([category, items]) => {
        if (items.length === 0) {
          return null;
        }

        return (
          <Card key={category} className="surface-panel rounded-[1.8rem] shadow-none">
            <CardHeader>
              <CardTitle>{CATEGORY_TITLES[category as SettingCategory]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {items.map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor={item.key}>
                      {item.label}
                    </label>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.source}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>

                  {item.input === 'textarea' ? (
                    <textarea
                      id={item.key}
                      value={values[item.key] || ''}
                      onChange={(event) => updateValue(item.key, event.target.value)}
                      placeholder={item.placeholder}
                      rows={category === 'prompts' ? 10 : 4}
                      className="surface-input min-h-[120px] w-full rounded-2xl border border-border/60 px-4 py-3 text-sm outline-none"
                    />
                  ) : item.input === 'select' ? (
                    <select
                      id={item.key}
                      value={values[item.key] || ''}
                      onChange={(event) => updateValue(item.key, event.target.value)}
                      className="surface-input h-11 w-full rounded-2xl border border-border/60 bg-transparent px-4 py-2 text-sm outline-none"
                    >
                      {(item.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={item.key}
                      type={item.input}
                      value={values[item.key] || ''}
                      onChange={(event) => updateValue(item.key, event.target.value)}
                      placeholder={item.placeholder}
                      className="surface-input rounded-2xl border-border/60"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </form>
  );
}
