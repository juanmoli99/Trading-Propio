export type AlpacaRateLimitConsumer =
  'SCANNER' | 'MARKET_DATA' | 'EXECUTOR' | 'SYSTEM';

export interface AlpacaRateLimitConsumerUsage {
  readonly requests: number;
  readonly lastRequestAt: Date | null;
}

export interface AlpacaSharedRateLimitSnapshot {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: Date | null;
  readonly consumers: Readonly<
    Record<AlpacaRateLimitConsumer, AlpacaRateLimitConsumerUsage>
  >;
}
