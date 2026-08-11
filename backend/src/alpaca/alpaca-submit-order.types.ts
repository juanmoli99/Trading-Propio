export type AlpacaSubmitOrderSide = 'buy' | 'sell';

export type AlpacaSubmitOrderType = 'market' | 'limit';

export type AlpacaSubmitOrderTimeInForce = 'day' | 'gtc';

export interface AlpacaSubmitOrderRequest {
  readonly symbol: string;
  readonly side: AlpacaSubmitOrderSide;
  readonly type: AlpacaSubmitOrderType;
  readonly timeInForce: AlpacaSubmitOrderTimeInForce;

  readonly quantity?: string;
  readonly notional?: string;

  readonly limitPrice?: string;
  readonly extendedHours?: boolean;

  readonly clientOrderId: string;
}
