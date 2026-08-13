import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_MAX_ENTRIES } from './market-data-cache.constants';
import type {
  MarketDataCacheEntry,
  MarketDataCacheSnapshot,
} from './market-data-cache.types';

@Injectable()
export class MarketDataCacheService {
  private readonly entries = new Map<string, MarketDataCacheEntry<unknown>>();

  private hits = 0;
  private misses = 0;
  private writes = 0;
  private evictions = 0;
  private expirations = 0;

  get<T>(key: string): T | null {
    const normalizedKey = this.normalizeKey(key);

    const entry = this.entries.get(normalizedKey);

    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (entry.expiresAtMs <= Date.now()) {
      this.entries.delete(normalizedKey);
      this.expirations += 1;
      this.misses += 1;

      return null;
    }

    this.hits += 1;

    return this.clone(entry.value as T);
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const normalizedKey = this.normalizeKey(key);

    this.validateTtl(ttlMs);

    if (
      !this.entries.has(normalizedKey) &&
      this.entries.size >= MARKET_DATA_CACHE_MAX_ENTRIES
    ) {
      this.evictOldest();
    }

    this.entries.set(normalizedKey, {
      value: this.clone(value),
      expiresAtMs: Date.now() + ttlMs,
    });

    this.writes += 1;
  }

  delete(key: string): boolean {
    return this.entries.delete(this.normalizeKey(key));
  }

  deleteByPrefix(prefix: string): number {
    const normalizedPrefix = this.normalizeKey(prefix);

    let deleted = 0;

    for (const key of this.entries.keys()) {
      if (!key.startsWith(normalizedPrefix)) {
        continue;
      }

      if (this.entries.delete(key)) {
        deleted += 1;
      }
    }

    return deleted;
  }

  clear(): void {
    this.entries.clear();
  }

  getSnapshot(): MarketDataCacheSnapshot {
    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      evictions: this.evictions,
      expirations: this.expirations,
    };
  }

  private evictOldest(): void {
    const oldestKey = this.entries.keys().next().value as string | undefined;

    if (oldestKey === undefined) {
      return;
    }

    this.entries.delete(oldestKey);
    this.evictions += 1;
  }

  private normalizeKey(key: string): string {
    const normalized = key.trim();

    if (!normalized) {
      throw new Error('Market data cache key is required');
    }

    return normalized;
  }

  private validateTtl(ttlMs: number): void {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0 || ttlMs > 60_000) {
      throw new Error(
        'Market data cache TTL must be between 1 and 60000 milliseconds',
      );
    }
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
