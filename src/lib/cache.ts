interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, ttlMs: number, compute: () => T): T {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = compute();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export async function getCachedAsync<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await compute();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  }
}
