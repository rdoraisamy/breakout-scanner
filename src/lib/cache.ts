interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiry: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton cache instance (persists across requests in the same process)
export const cache = new InMemoryCache();

export const TTL = {
  SCANNER: 5 * 60 * 1000,     // 5 minutes
  STOCK_DETAIL: 10 * 60 * 1000, // 10 minutes
  CHART: 60 * 60 * 1000,       // 1 hour
};
