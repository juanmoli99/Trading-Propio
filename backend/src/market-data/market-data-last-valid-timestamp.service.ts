import { Injectable } from '@nestjs/common';
import type {
  MarketDataKind,
  MarketDataLastValidTimestampKey,
  MarketDataLastValidTimestampSnapshot,
} from './market-data-last-valid-timestamp.types';

@Injectable()
export class MarketDataLastValidTimestampService {
  private readonly timestamps = new Map<
    string,
    MarketDataLastValidTimestampSnapshot
  >();

  record(
    key: MarketDataLastValidTimestampKey,
    timestamp: Date,
  ): MarketDataLastValidTimestampSnapshot {
    const normalizedKey = this.normalizeKey(key);

    const timestampMs = timestamp.getTime();

    if (!Number.isFinite(timestampMs)) {
      throw new Error('Invalid market data last valid timestamp');
    }

    const storageKey = this.buildStorageKey(
      normalizedKey.symbol,
      normalizedKey.kind,
    );

    const existing = this.timestamps.get(storageKey);

    if (existing && timestampMs < existing.timestamp.getTime()) {
      return this.clone(existing);
    }

    const snapshot: MarketDataLastValidTimestampSnapshot = {
      ...normalizedKey,
      timestamp: new Date(timestampMs),
      recordedAt: new Date(),
    };

    this.timestamps.set(storageKey, snapshot);

    return this.clone(snapshot);
  }

  get(
    key: MarketDataLastValidTimestampKey,
  ): MarketDataLastValidTimestampSnapshot | null {
    const normalizedKey = this.normalizeKey(key);

    const snapshot = this.timestamps.get(
      this.buildStorageKey(normalizedKey.symbol, normalizedKey.kind),
    );

    return snapshot ? this.clone(snapshot) : null;
  }

  getAll(): MarketDataLastValidTimestampSnapshot[] {
    return Array.from(this.timestamps.values(), (snapshot) =>
      this.clone(snapshot),
    );
  }

  private normalizeKey(
    key: MarketDataLastValidTimestampKey,
  ): MarketDataLastValidTimestampKey {
    const symbol = key.symbol.trim().toUpperCase();

    if (!symbol || symbol.length > 32 || /\s/.test(symbol)) {
      throw new Error('Invalid market data last valid timestamp symbol');
    }

    this.validateKind(key.kind);

    return {
      symbol,
      kind: key.kind,
    };
  }

  private validateKind(kind: MarketDataKind): void {
    if (kind !== 'BAR' && kind !== 'QUOTE' && kind !== 'TRADE') {
      throw new Error('Invalid market data kind');
    }
  }

  private buildStorageKey(symbol: string, kind: MarketDataKind): string {
    return `${kind}:${symbol}`;
  }

  private clone(
    snapshot: MarketDataLastValidTimestampSnapshot,
  ): MarketDataLastValidTimestampSnapshot {
    return {
      symbol: snapshot.symbol,
      kind: snapshot.kind,
      timestamp: new Date(snapshot.timestamp),
      recordedAt: new Date(snapshot.recordedAt),
    };
  }
}
