import type { AlpacaOrder } from './alpaca-order.types';

export interface AlpacaOrderApiResponse {
  id?: unknown;
  client_order_id?: unknown;
  symbol?: unknown;
  asset_id?: unknown;
  asset_class?: unknown;

  side?: unknown;
  type?: unknown;
  time_in_force?: unknown;
  status?: unknown;

  qty?: unknown;
  notional?: unknown;

  filled_qty?: unknown;
  filled_avg_price?: unknown;

  limit_price?: unknown;
  stop_price?: unknown;

  submitted_at?: unknown;
  accepted_at?: unknown;
  filled_at?: unknown;
  canceled_at?: unknown;
  expired_at?: unknown;
  replaced_at?: unknown;

  replaced_by?: unknown;
  replaces?: unknown;
}

export function normalizeAlpacaOrder(
  value: AlpacaOrderApiResponse,
): AlpacaOrder {
  return {
    id: requireString(value.id, 'id'),

    clientOrderId: requireString(value.client_order_id, 'client_order_id'),

    symbol: requireString(value.symbol, 'symbol'),

    assetId: optionalString(value.asset_id, 'asset_id'),

    assetClass: optionalString(value.asset_class, 'asset_class'),

    side: requireString(value.side, 'side'),

    type: requireString(value.type, 'type'),

    timeInForce: requireString(value.time_in_force, 'time_in_force'),

    status: requireString(value.status, 'status'),

    quantity: optionalFinancialString(value.qty, 'qty'),

    notional: optionalFinancialString(value.notional, 'notional'),

    filledQuantity: requireFinancialString(value.filled_qty, 'filled_qty'),

    filledAveragePrice: optionalFinancialString(
      value.filled_avg_price,
      'filled_avg_price',
    ),

    limitPrice: optionalFinancialString(value.limit_price, 'limit_price'),

    stopPrice: optionalFinancialString(value.stop_price, 'stop_price'),

    submittedAt: optionalDate(value.submitted_at, 'submitted_at'),

    acceptedAt: optionalDate(value.accepted_at, 'accepted_at'),

    filledAt: optionalDate(value.filled_at, 'filled_at'),

    canceledAt: optionalDate(value.canceled_at, 'canceled_at'),

    expiredAt: optionalDate(value.expired_at, 'expired_at'),

    replacedAt: optionalDate(value.replaced_at, 'replaced_at'),

    replacedBy: optionalString(value.replaced_by, 'replaced_by'),

    replaces: optionalString(value.replaces, 'replaces'),
  };
}

export function normalizeAlpacaOrders(
  values: readonly AlpacaOrderApiResponse[],
): AlpacaOrder[] {
  return values.map(normalizeAlpacaOrder);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca order field: ${field}`);
  }

  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireString(value, field);
}

function requireFinancialString(value: unknown, field: string): string {
  const result = requireString(value, field);

  if (!Number.isFinite(Number(result))) {
    throw new Error(`Invalid Alpaca financial field: ${field}`);
  }

  return result;
}

function optionalFinancialString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireFinancialString(value, field);
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = requireString(value, field);

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Alpaca order date: ${field}`);
  }

  return date;
}
