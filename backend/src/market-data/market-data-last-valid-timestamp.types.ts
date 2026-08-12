export const MARKET_DATA_KINDS = ['BAR', 'QUOTE', 'TRADE'] as const;

export type MarketDataKind = (typeof MARKET_DATA_KINDS)[number];

export interface MarketDataLastValidTimestampKey {
  readonly symbol: string;
  readonly kind: MarketDataKind;
}

export interface MarketDataLastValidTimestampSnapshot extends MarketDataLastValidTimestampKey {
  readonly timestamp: Date;
  readonly recordedAt: Date;
}
