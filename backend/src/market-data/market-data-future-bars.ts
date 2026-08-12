import type { MarketDataBar, MarketDataFutureBar } from './market-data.types';

export function detectFutureMarketDataBars(
  bars: readonly MarketDataBar[],
  referenceTimestamp: Date,
): MarketDataFutureBar[] {
  const referenceTime = referenceTimestamp.getTime();

  if (!Number.isFinite(referenceTime)) {
    throw new Error('Invalid future bar reference timestamp');
  }

  const futureBars: MarketDataFutureBar[] = [];

  for (const bar of bars) {
    const timestamp = bar.timestamp.getTime();

    if (!Number.isFinite(timestamp)) {
      throw new Error('Invalid market data bar timestamp');
    }

    if (timestamp <= referenceTime) {
      continue;
    }

    futureBars.push({
      timestamp: new Date(timestamp),
      referenceTimestamp: new Date(referenceTime),
      futureByMs: timestamp - referenceTime,
    });
  }

  return futureBars;
}
