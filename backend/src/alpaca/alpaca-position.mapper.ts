import type { AlpacaPosition } from './alpaca-position.types';

export interface AlpacaPositionApiResponse {
  asset_id?: unknown;
  symbol?: unknown;
  exchange?: unknown;
  asset_class?: unknown;

  qty?: unknown;
  qty_available?: unknown;
  side?: unknown;

  avg_entry_price?: unknown;
  market_value?: unknown;
  cost_basis?: unknown;

  unrealized_pl?: unknown;
  unrealized_plpc?: unknown;

  current_price?: unknown;
  lastday_price?: unknown;
  change_today?: unknown;
}

export function normalizeAlpacaPosition(
  value: AlpacaPositionApiResponse,
): AlpacaPosition {
  return {
    assetId: requireString(value.asset_id, 'asset_id'),

    symbol: requireString(value.symbol, 'symbol'),

    exchange: requireString(value.exchange, 'exchange'),

    assetClass: requireString(value.asset_class, 'asset_class'),

    quantity: requireFinancialString(value.qty, 'qty'),

    availableQuantity: optionalFinancialString(
      value.qty_available,
      'qty_available',
    ),

    side: requireString(value.side, 'side'),

    averageEntryPrice: requireFinancialString(
      value.avg_entry_price,
      'avg_entry_price',
    ),

    marketValue: requireFinancialString(value.market_value, 'market_value'),

    costBasis: requireFinancialString(value.cost_basis, 'cost_basis'),

    unrealizedPl: requireFinancialString(value.unrealized_pl, 'unrealized_pl'),

    unrealizedPlPercent: requireFinancialString(
      value.unrealized_plpc,
      'unrealized_plpc',
    ),

    currentPrice: requirePositiveFinancialString(
      value.current_price,
      'current_price',
    ),

    lastDayPrice: optionalPositiveFinancialString(
      value.lastday_price,
      'lastday_price',
    ),

    changeToday: optionalFinancialString(value.change_today, 'change_today'),
  };
}

export function normalizeAlpacaPositions(
  values: readonly AlpacaPositionApiResponse[],
): AlpacaPosition[] {
  return values.map(normalizeAlpacaPosition);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca position field: ${field}`);
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

function optionalFinancialString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireFinancialString(value, field);
}

function requirePositiveFinancialString(value: unknown, field: string): string {
  const result = requireFinancialString(value, field);

  if (Number(result) <= 0) {
    throw new Error(`Invalid Alpaca positive financial field: ${field}`);
  }

  return result;
}

function optionalPositiveFinancialString(
  value: unknown,
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requirePositiveFinancialString(value, field);
}
