import type { MarketDataSort } from './market-data.types';

export interface TimestampedMarketData {
  readonly timestamp: Date;
}

export function validateMarketDataChronologicalOrder<
  T extends TimestampedMarketData,
>(items: readonly T[], sort: MarketDataSort = 'asc'): void {
  if (sort !== 'asc' && sort !== 'desc') {
    throw new Error('Invalid market data chronological sort');
  }

  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];

    if (!previous || !current) {
      throw new Error('Invalid market data chronological sequence');
    }

    const previousTime = previous.timestamp.getTime();
    const currentTime = current.timestamp.getTime();

    if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) {
      throw new Error('Invalid market data chronological timestamp');
    }

    if (sort === 'asc' && currentTime < previousTime) {
      throw new Error(
        'Market data timestamps are not in ascending chronological order',
      );
    }

    if (sort === 'desc' && currentTime > previousTime) {
      throw new Error(
        'Market data timestamps are not in descending chronological order',
      );
    }
  }
}
