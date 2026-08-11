export interface AlpacaRateLimitSnapshot {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: Date | null;
}
