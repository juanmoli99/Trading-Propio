export interface MarketDataPricePoint {
  readonly timestamp: Date;
  readonly price: number;
}

export interface MarketDataPriceSanityIssue {
  readonly previousTimestamp: Date;
  readonly timestamp: Date;
  readonly previousPrice: number;
  readonly price: number;
  readonly absoluteChange: number;
  readonly percentageChange: number;
  readonly maxPercentageChange: number;
}

export function detectMarketDataPriceSanityIssues(
  points: readonly MarketDataPricePoint[],
  maxPercentageChange: number,
): MarketDataPriceSanityIssue[] {
  validateMaxPercentageChange(maxPercentageChange);

  if (points.length < 2) {
    return [];
  }

  const issues: MarketDataPriceSanityIssue[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (!previous || !current) {
      throw new Error('Invalid market data price sequence');
    }

    validatePricePoint(previous);
    validatePricePoint(current);

    const absoluteChange = Math.abs(current.price - previous.price);

    const percentageChange = (absoluteChange / previous.price) * 100;

    if (percentageChange <= maxPercentageChange) {
      continue;
    }

    issues.push({
      previousTimestamp: new Date(previous.timestamp),
      timestamp: new Date(current.timestamp),
      previousPrice: previous.price,
      price: current.price,
      absoluteChange,
      percentageChange,
      maxPercentageChange,
    });
  }

  return issues;
}

function validatePricePoint(point: MarketDataPricePoint): void {
  const timestamp = point.timestamp.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid market data price timestamp');
  }

  if (
    typeof point.price !== 'number' ||
    !Number.isFinite(point.price) ||
    point.price <= 0
  ) {
    throw new Error('Invalid market data sanity price');
  }
}

function validateMaxPercentageChange(value: number): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 100_000
  ) {
    throw new Error('Invalid market data maximum percentage change');
  }
}
