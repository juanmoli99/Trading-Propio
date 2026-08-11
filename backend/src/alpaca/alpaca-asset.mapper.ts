import type { AlpacaAsset } from './alpaca-asset.types';

export interface AlpacaAssetApiResponse {
  id?: unknown;
  class?: unknown;
  exchange?: unknown;
  symbol?: unknown;
  name?: unknown;
  status?: unknown;
  tradable?: unknown;
  fractionable?: unknown;
  shortable?: unknown;
  easy_to_borrow?: unknown;
}

export function normalizeAlpacaAsset(
  value: AlpacaAssetApiResponse,
): AlpacaAsset {
  return {
    id: requireString(value.id, 'id'),
    assetClass: requireString(value.class, 'class'),
    exchange: requireString(value.exchange, 'exchange'),
    symbol: requireString(value.symbol, 'symbol'),
    name: requireString(value.name, 'name'),
    status: requireString(value.status, 'status'),
    tradable: requireBoolean(value.tradable, 'tradable'),
    fractionable: requireBoolean(value.fractionable, 'fractionable'),
    shortable: requireBoolean(value.shortable, 'shortable'),
    easyToBorrow: requireBoolean(value.easy_to_borrow, 'easy_to_borrow'),
  };
}

export function normalizeAlpacaAssets(
  values: readonly AlpacaAssetApiResponse[],
): AlpacaAsset[] {
  return values.map(normalizeAlpacaAsset);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca asset field: ${field}`);
  }

  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid Alpaca asset field: ${field}`);
  }

  return value;
}
