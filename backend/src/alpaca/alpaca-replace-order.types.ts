export interface AlpacaReplaceOrderRequest {
  readonly quantity?: string;
  readonly timeInForce?: 'day' | 'gtc';
  readonly limitPrice?: string;
  readonly stopPrice?: string;
  readonly clientOrderId?: string;
}
