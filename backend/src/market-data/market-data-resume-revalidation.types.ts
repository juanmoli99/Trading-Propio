export const MARKET_DATA_RESUME_REVALIDATION_CHECKS = [
  'SPREAD',
  'VOLATILITY',
  'SIGNAL',
  'RISK',
] as const;

export type MarketDataResumeRevalidationCheckName =
  (typeof MARKET_DATA_RESUME_REVALIDATION_CHECKS)[number];

export interface MarketDataResumeRevalidationCheck {
  readonly name: MarketDataResumeRevalidationCheckName;
  readonly passed: boolean;
  readonly validatedAt: Date;
  readonly reason?: string;
}

export interface MarketDataResumeRevalidationInput {
  readonly symbol: string;
  readonly checks: readonly MarketDataResumeRevalidationCheck[];
}

export interface MarketDataResumeRevalidationCheckResult {
  readonly name: MarketDataResumeRevalidationCheckName;
  readonly passed: boolean;
  readonly validatedAt: Date;
  readonly reason: string | null;
}

export interface MarketDataResumeRevalidationResult {
  readonly symbol: string;
  readonly resumed: boolean;
  readonly resumedAt: Date;
  readonly valid: boolean;
  readonly checks: readonly MarketDataResumeRevalidationCheckResult[];
  readonly reasons: readonly string[];
}