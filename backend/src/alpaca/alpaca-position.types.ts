export interface AlpacaPosition {
  readonly assetId: string;
  readonly symbol: string;
  readonly exchange: string;
  readonly assetClass: string;

  readonly quantity: string;
  readonly availableQuantity: string | null;
  readonly side: string;

  readonly averageEntryPrice: string;
  readonly marketValue: string;
  readonly costBasis: string;

  readonly unrealizedPl: string;
  readonly unrealizedPlPercent: string;

  readonly currentPrice: string;
  readonly lastDayPrice: string | null;
  readonly changeToday: string | null;
}
