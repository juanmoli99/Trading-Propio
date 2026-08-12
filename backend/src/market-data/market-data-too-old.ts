export interface TimestampedMarketData {
  readonly timestamp: Date;
}

export interface MarketDataTooOldItem {
  readonly timestamp: Date;
  readonly referenceTimestamp: Date;
  readonly ageMs: number;
  readonly maxAgeMs: number;
  readonly exceededByMs: number;
}

export function detectTooOldMarketData<T extends TimestampedMarketData>(
  items: readonly T[],
  referenceTimestamp: Date,
  maxAgeMs: number,
): MarketDataTooOldItem[] {
  const referenceTime = referenceTimestamp.getTime();

  if (!Number.isFinite(referenceTime)) {
    throw new Error('Invalid market data age reference timestamp');
  }

  if (!Number.isInteger(maxAgeMs) || maxAgeMs < 0) {
    throw new Error('Market data max age must be a non-negative integer');
  }

  const tooOld: MarketDataTooOldItem[] = [];

  for (const item of items) {
    const timestamp = item.timestamp.getTime();

    if (!Number.isFinite(timestamp)) {
      throw new Error('Invalid market data timestamp');
    }

    const ageMs = referenceTime - timestamp;

    if (ageMs <= maxAgeMs) {
      continue;
    }

    tooOld.push({
      timestamp: new Date(timestamp),
      referenceTimestamp: new Date(referenceTime),
      ageMs,
      maxAgeMs,
      exceededByMs: ageMs - maxAgeMs,
    });
  }

  return tooOld;
}
