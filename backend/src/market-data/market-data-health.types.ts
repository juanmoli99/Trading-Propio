export const MARKET_DATA_HEALTH_STATUSES = [
  'HEALTHY',
  'STALE',
  'UNAVAILABLE',
  'INCONSISTENT',
] as const;

export type MarketDataHealthStatus =
  (typeof MARKET_DATA_HEALTH_STATUSES)[number];

export interface MarketDataHealthEvaluation {
  readonly available: boolean;
  readonly stale: boolean;
  readonly inconsistent: boolean;
  readonly reasons?: readonly string[];
}

export interface MarketDataHealthSnapshot {
  readonly status: MarketDataHealthStatus;
  readonly reasons: readonly string[];
  readonly updatedAt: string;
}
