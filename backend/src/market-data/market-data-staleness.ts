import { detectTooOldMarketData } from './market-data-too-old';
import type {
  MarketDataTooOldItem,
  TimestampedMarketData,
} from './market-data-too-old';

export interface MarketDataStalenessResult {
  readonly stale: boolean;
  readonly referenceTimestamp: Date;
  readonly maxAgeMs: number;
  readonly staleItems: MarketDataTooOldItem[];
}

export function evaluateMarketDataStaleness<T extends TimestampedMarketData>(
  items: readonly T[],
  referenceTimestamp: Date,
  maxAgeMs: number,
): MarketDataStalenessResult {
  const staleItems = detectTooOldMarketData(
    items,
    referenceTimestamp,
    maxAgeMs,
  );

  return {
    stale: staleItems.length > 0,
    referenceTimestamp: new Date(referenceTimestamp.getTime()),
    maxAgeMs,
    staleItems,
  };
}
