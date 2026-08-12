import { Injectable } from '@nestjs/common';
import type { MarketDataRequestDedupSnapshot } from './market-data-request-dedup.types';

@Injectable()
export class MarketDataRequestDedupService {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  private leaders = 0;

  private followers = 0;

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const normalizedKey = this.normalizeKey(key);

    const existing = this.inFlight.get(normalizedKey);

    if (existing !== undefined) {
      this.followers += 1;

      return existing as Promise<T>;
    }

    this.leaders += 1;

    const promise = operation();

    this.inFlight.set(normalizedKey, promise);

    try {
      return await promise;
    } finally {
      if (this.inFlight.get(normalizedKey) === promise) {
        this.inFlight.delete(normalizedKey);
      }
    }
  }

  getSnapshot(): MarketDataRequestDedupSnapshot {
    return {
      inFlight: this.inFlight.size,
      leaders: this.leaders,
      followers: this.followers,
    };
  }

  private normalizeKey(key: string): string {
    const normalized = key.trim();

    if (!normalized) {
      throw new Error('Market data request dedup key is required');
    }

    return normalized;
  }
}
