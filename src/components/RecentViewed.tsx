'use client';

import Link from 'next/link';
import { Bookmark, Clock, History, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readLocalJSON, writeLocalJSON } from '@/lib/browser-storage';

interface RecentProject {
  id: number;
  fullName: string;
  intro: string;
  stars: number;
  language: string | null;
  viewedAt: number;
}

interface BookmarkedProject {
  id: number;
  fullName: string;
  intro: string;
  bookmarkedAt: number;
}

const RECENT_KEY = 'star-wiki:recent-projects';
const BOOKMARK_KEY = 'star-wiki:bookmarks';
const MAX_RECENT = 8;

function formatRelative(ts: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}

export function RecentViewed() {
  const [mounted, setMounted] = useState(false);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedProject[]>([]);
  const [tab, setTab] = useState<'recent' | 'bookmarks'>('recent');

  useEffect(() => {
    setMounted(true);
    setRecent(readLocalJSON<RecentProject[]>(RECENT_KEY, []));
    setBookmarks(readLocalJSON<BookmarkedProject[]>(BOOKMARK_KEY, []));
  }, []);

  const removeRecent = (id: number) => {
    const next = recent.filter((item) => item.id !== id);
    setRecent(next);
    writeLocalJSON(RECENT_KEY, next);
  };

  const removeBookmark = (id: number) => {
    const next = bookmarks.filter((item) => item.id !== id);
    setBookmarks(next);
    writeLocalJSON(BOOKMARK_KEY, next);
  };

  if (!mounted || (recent.length === 0 && bookmarks.length === 0)) {
    return null;
  }

  const currentList = tab === 'recent' ? recent : bookmarks;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">个人空间</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            你的浏览与收藏
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            仅存在你本地浏览器中，不上传到服务器。
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-border/60 bg-background/40 p-0.5">
          <button
            type="button"
            onClick={() => setTab('recent')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === 'recent' ? 'bg-primary/12 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="mr-1 inline h-3.5 w-3.5" />
            最近浏览 {recent.length > 0 ? `· ${recent.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('bookmarks')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === 'bookmarks' ? 'bg-primary/12 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className="mr-1 inline h-3.5 w-3.5" />
            收藏 {bookmarks.length > 0 ? `· ${bookmarks.length}` : ''}
          </button>
        </div>
      </div>

      {currentList.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {currentList.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="surface-panel group relative flex flex-col gap-2 rounded-[1.2rem] p-4 transition-colors hover:border-primary/30"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  tab === 'recent' ? removeRecent(item.id) : removeBookmark(item.id);
                }}
                className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground group-hover:flex"
                aria-label="移除"
                title="移除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/projects/${item.id}`}
                className="focus-ring flex flex-1 flex-col gap-1.5"
              >
                <p className="truncate pr-6 text-sm font-medium text-foreground group-hover:text-primary">
                  {item.fullName}
                </p>
                {item.intro ? (
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.intro}</p>
                ) : null}
                <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  {tab === 'recent' ? (
                    <>
                      <Clock className="h-3 w-3" />
                      {formatRelative((item as RecentProject).viewedAt)}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3 w-3" />
                      收藏于 {formatRelative((item as BookmarkedProject).bookmarkedAt)}
                    </>
                  )}
                  {(item as RecentProject).stars != null ? (
                    <span className="ml-auto inline-flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {(item as RecentProject).stars}
                    </span>
                  ) : null}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-panel rounded-[1.2rem] px-5 py-8 text-center text-sm text-muted-foreground">
          {tab === 'recent' ? '还没有最近浏览。点开任何项目详情都会自动记录。' : '还没有收藏。在项目详情页右上角点"收藏"按钮。'}
        </div>
      )}
    </section>
  );
}

export function RecentViewedTracker({
  id,
  fullName,
  intro,
  stars,
  language,
}: {
  id: number;
  fullName: string;
  intro: string;
  stars: number;
  language: string | null;
}) {
  useEffect(() => {
    const current = readLocalJSON<RecentProject[]>(RECENT_KEY, []);
    const filtered = current.filter((item) => item.id !== id);
    const next: RecentProject[] = [
      { id, fullName, intro, stars, language, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT);
    writeLocalJSON(RECENT_KEY, next);
  }, [id, fullName, intro, stars, language]);

  return null;
}

export function BookmarkButton({
  id,
  fullName,
  intro,
}: {
  id: number;
  fullName: string;
  intro: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setMounted(true);
    const list = readLocalJSON<BookmarkedProject[]>(BOOKMARK_KEY, []);
    setBookmarked(list.some((item) => item.id === id));
  }, [id]);

  const toggle = () => {
    const list = readLocalJSON<BookmarkedProject[]>(BOOKMARK_KEY, []);
    if (bookmarked) {
      writeLocalJSON(BOOKMARK_KEY, list.filter((item) => item.id !== id));
      setBookmarked(false);
    } else {
      const next: BookmarkedProject[] = [
        { id, fullName, intro, bookmarkedAt: Date.now() },
        ...list.filter((item) => item.id !== id),
      ];
      writeLocalJSON(BOOKMARK_KEY, next);
      setBookmarked(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`surface-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
        mounted && bookmarked
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-pressed={bookmarked}
      title={bookmarked ? '取消收藏' : '加入收藏'}
      suppressHydrationWarning
    >
      <Bookmark className={`h-3.5 w-3.5 ${mounted && bookmarked ? 'fill-current' : ''}`} />
      {mounted && bookmarked ? '已收藏' : '收藏'}
    </button>
  );
}
