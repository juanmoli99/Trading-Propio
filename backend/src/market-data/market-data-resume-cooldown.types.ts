export interface MarketDataResumeCooldownResult {
  readonly symbol: string;
  readonly enabled: boolean;
  readonly active: boolean;
  readonly resumedAt: Date;
  readonly cooldownMs: number;
  readonly cooldownEndsAt: Date;
  readonly remainingMs: number;
}