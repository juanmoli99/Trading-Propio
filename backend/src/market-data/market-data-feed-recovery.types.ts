export const MARKET_DATA_FEED_RECOVERY_STATUSES = [
  'STABLE',
  'OUTAGE',
  'RECOVERING',
] as const;

export type MarketDataFeedRecoveryStatus =
  (typeof MARKET_DATA_FEED_RECOVERY_STATUSES)[number];

export interface MarketDataFeedRecoverySnapshot {
  readonly status: MarketDataFeedRecoveryStatus;
  readonly outageStartedAt?: string;
  readonly reconnectedAt?: string;
  readonly warmupCompletedAt?: string;
  readonly updatedAt: string;
}