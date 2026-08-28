export interface TtlCacheEntry<T> {
  value: T;
  timestamp: number;
}

export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, TtlCacheEntry<T>>();

  const isValid = (
    entry: TtlCacheEntry<T> | null | undefined,
    now: number = Date.now(),
  ): boolean => {
    if (!entry) return false;
    return now - entry.timestamp < ttlMs;
  };

  return {
    makeKey(query: string, searchType: string, filters: unknown): string {
      return `${query}|${searchType}|${JSON.stringify(filters)}`;
    },
    get(key: string): TtlCacheEntry<T> | undefined {
      return store.get(key);
    },
    set(key: string, value: T, now: number = Date.now()): void {
      store.set(key, { value, timestamp: now });
    },
    isValid,
    clear(): void {
      store.clear();
    },
  };
}
