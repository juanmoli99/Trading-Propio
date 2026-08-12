export interface MarketDataRateLimitSnapshot {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: Date | null;
  readonly requests: number;
  readonly waits: number;
  readonly rateLimitResponses: number;
}
