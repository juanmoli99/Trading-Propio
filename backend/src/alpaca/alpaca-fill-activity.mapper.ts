import type { AlpacaFillActivity } from './alpaca-fill-activity.types';

export interface AlpacaFillActivityApiResponse {
  id?: unknown;
  activity_type?: unknown;
  order_id?: unknown;
  symbol?: unknown;
  side?: unknown;
  type?: unknown;
  qty?: unknown;
  price?: unknown;
  cum_qty?: unknown;
  leaves_qty?: unknown;
  transaction_time?: unknown;
}

export function normalizeAlpacaFillActivity(
  value: AlpacaFillActivityApiResponse,
): AlpacaFillActivity {
  const activityType = requireString(value.activity_type, 'activity_type');

  if (activityType !== 'FILL') {
    throw new Error('Invalid Alpaca fill activity type');
  }

  return {
    id: requireString(value.id, 'id'),
    activityType: 'FILL',
    orderId: requireString(value.order_id, 'order_id'),
    symbol: requireString(value.symbol, 'symbol'),
    side: requireString(value.side, 'side'),
    type: requireString(value.type, 'type'),
    quantity: requireFinancialString(value.qty, 'qty'),
    price: requirePositiveFinancialString(value.price, 'price'),
    cumulativeQuantity: requireFinancialString(value.cum_qty, 'cum_qty'),
    leavesQuantity: requireFinancialString(value.leaves_qty, 'leaves_qty'),
    transactionTime: requireDate(value.transaction_time, 'transaction_time'),
  };
}

export function normalizeAlpacaFillActivities(
  values: readonly AlpacaFillActivityApiResponse[],
): AlpacaFillActivity[] {
  return values.map(normalizeAlpacaFillActivity);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca activity field: ${field}`);
  }

  return value;
}

function requireFinancialString(value: unknown, field: string): string {
  const result = requireString(value, field);

  if (!Number.isFinite(Number(result))) {
    throw new Error(`Invalid Alpaca financial field: ${field}`);
  }

  return result;
}

function requirePositiveFinancialString(value: unknown, field: string): string {
  const result = requireFinancialString(value, field);

  if (Number(result) <= 0) {
    throw new Error(`Invalid Alpaca positive financial field: ${field}`);
  }

  return result;
}

function requireDate(value: unknown, field: string): Date {
  const text = requireString(value, field);

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Alpaca activity date: ${field}`);
  }

  return date;
}
