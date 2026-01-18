interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(cleanupIntervalMs: number = 60000) {
    this.startCleanup(cleanupIntervalMs)
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  clearPattern(pattern: RegExp): void {
    Array.from(this.cache.keys()).forEach(key => {
      if (pattern.test(key)) {
        this.cache.delete(key)
      }
    })
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
        }
      })
    }, intervalMs)
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  getStats(): {
    size: number
    entries: Array<{ key: string; ttl: number; age: number }>
  } {
    const now = Date.now()
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ttl: entry.ttl,
        age: now - entry.timestamp,
      })),
    }
  }
}

export const createCache = () => new CacheManager()

export const globalCache = createCache()

export const cacheKey = {
  schools: (userId: string) => 'schools:' + userId,
  schoolDetail: (id: string) => 'school:' + id,
  coaches: (userId: string) => 'coaches:' + userId,
  coachDetail: (id: string) => 'coach:' + id,
  interactions: (userId: string) => 'interactions:' + userId,
  metrics: (userId: string) => 'metrics:' + userId,
  search: (userId: string, query: string, type: string) => 'search:' + userId + ':' + query + ':' + type,
  templates: (userId: string) => 'templates:' + userId,
  reminders: (userId: string) => 'reminders:' + userId,
}

export const CACHE_DURATION = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 900000, // 15 minutes
  VERY_LONG: 3600000, // 1 hour
}
