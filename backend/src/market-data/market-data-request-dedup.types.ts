export interface MarketDataRequestDedupSnapshot {
  readonly inFlight: number;
  readonly leaders: number;
  readonly followers: number;
}
