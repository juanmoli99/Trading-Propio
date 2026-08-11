export interface AlpacaOrder {
  readonly id: string;
  readonly clientOrderId: string;
  readonly symbol: string;
  readonly assetId: string | null;
  readonly assetClass: string | null;

  readonly side: string;
  readonly type: string;
  readonly timeInForce: string;
  readonly status: string;

  readonly quantity: string | null;
  readonly notional: string | null;

  readonly filledQuantity: string;
  readonly filledAveragePrice: string | null;

  readonly limitPrice: string | null;
  readonly stopPrice: string | null;

  readonly submittedAt: Date | null;
  readonly acceptedAt: Date | null;
  readonly filledAt: Date | null;
  readonly canceledAt: Date | null;
  readonly expiredAt: Date | null;
  readonly replacedAt: Date | null;

  readonly replacedBy: string | null;
  readonly replaces: string | null;
}
