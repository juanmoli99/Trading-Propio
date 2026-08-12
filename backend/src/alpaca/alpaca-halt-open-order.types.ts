import type { MarketDataHaltReason } from '../market-data/market-data-halt-detection.types';

export const ALPACA_HALT_OPEN_ORDER_MANAGEMENT_STATES = [
  'NOT_HALTED',
  'NO_OPEN_ORDERS',
  'REVIEW_REQUIRED',
] as const;

export type AlpacaHaltOpenOrderManagementState =
  (typeof ALPACA_HALT_OPEN_ORDER_MANAGEMENT_STATES)[number];

export interface AlpacaHaltAffectedOpenOrder {
  readonly orderId: string;
  readonly clientOrderId: string;
  readonly symbol: string;
  readonly side: string;
  readonly type: string;
  readonly timeInForce: string;
  readonly status: string;
  readonly quantity: string | null;
  readonly notional: string | null;
  readonly filledQuantity: string;
  readonly cancelable: boolean;
  readonly automaticActionTaken: false;
}

export interface AlpacaHaltOpenOrderManagementResult {
  readonly symbol: string;
  readonly state: AlpacaHaltOpenOrderManagementState;
  readonly haltedAt: Date | null;
  readonly haltReason: MarketDataHaltReason | null;
  readonly openOrders: readonly AlpacaHaltAffectedOpenOrder[];
  readonly automaticActionTaken: false;
}