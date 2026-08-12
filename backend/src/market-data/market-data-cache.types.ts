export interface MarketDataCacheSnapshot {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly evictions: number;
  readonly expirations: number;
}

export interface MarketDataCacheEntry<T> {
  readonly value: T;
  readonly expiresAtMs: number;
}
