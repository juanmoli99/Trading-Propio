import type {
  CreateTradingSymbolInput,
  TradingSymbol,
  TradingSymbolPersistenceRecord,
} from './symbol.types';

export function normalizeTradingSymbol(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
    throw new Error('Invalid trading symbol');
  }

  return normalized;
}

export function createTradingSymbolInput(
  input: CreateTradingSymbolInput,
): CreateTradingSymbolInput {
  return {
    symbol: normalizeTradingSymbol(input.symbol),
  };
}

export function mapTradingSymbolRecord(
  record: TradingSymbolPersistenceRecord,
): TradingSymbol {
  const id = record.id.trim();

  if (!id) {
    throw new Error('Invalid trading symbol record ID');
  }

  const symbol = normalizeTradingSymbol(record.symbol);

  if (!Number.isInteger(record.version) || record.version < 0) {
    throw new Error(`Invalid trading symbol version for ${symbol}`);
  }

  const createdAt = cloneValidDate(record.createdAt, 'createdAt', symbol);

  const updatedAt = cloneValidDate(record.updatedAt, 'updatedAt', symbol);

  if (updatedAt.getTime() < createdAt.getTime()) {
    throw new Error(`Trading symbol ${symbol} has updatedAt before createdAt`);
  }

  return {
    id,
    symbol,
    status: record.status,

    alpacaAssetId: normalizeOptionalText(
      record.alpacaAssetId,
      'alpacaAssetId',
      symbol,
    ),

    assetClass: normalizeOptionalText(record.assetClass, 'assetClass', symbol),

    exchange: normalizeOptionalText(record.exchange, 'exchange', symbol),

    name: normalizeOptionalText(record.name, 'name', symbol),

    alpacaStatus: normalizeOptionalText(
      record.alpacaStatus,
      'alpacaStatus',
      symbol,
    ),

    tradable: record.tradable,
    fractionable: record.fractionable,
    shortable: record.shortable,
    easyToBorrow: record.easyToBorrow,

    lastValidatedAt:
      record.lastValidatedAt === null
        ? null
        : cloneValidDate(record.lastValidatedAt, 'lastValidatedAt', symbol),

    version: record.version,
    createdAt,
    updatedAt,
  };
}

function normalizeOptionalText(
  value: string | null,
  field: string,
  symbol: string,
): string | null {
  if (value === null) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Invalid trading symbol ${field} for ${symbol}`);
  }

  return normalized;
}

function cloneValidDate(value: Date, field: string, symbol: string): Date {
  const cloned = new Date(value.getTime());

  if (!Number.isFinite(cloned.getTime())) {
    throw new Error(`Invalid trading symbol ${field} for ${symbol}`);
  }

  return cloned;
}
