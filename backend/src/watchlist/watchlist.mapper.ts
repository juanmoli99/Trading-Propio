import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  WatchlistEntry,
  WatchlistPersistenceRecord,
} from './watchlist.types';

export function mapWatchlistRecord(
  record: WatchlistPersistenceRecord,
): WatchlistEntry {
  const id = normalizeRequiredText(record.id, 'watchlist ID');

  const symbol = normalizeTradingSymbol(record.symbol);

  const tradingSymbolId =
    record.tradingSymbolId === null
      ? null
      : normalizeRequiredText(record.tradingSymbolId, 'trading symbol ID');

  if (!Number.isInteger(record.version) || record.version < 0) {
    throw new Error(`Invalid watchlist version for ${symbol}`);
  }

  const createdAt = cloneValidDate(record.createdAt, 'createdAt', symbol);

  const updatedAt = cloneValidDate(record.updatedAt, 'updatedAt', symbol);

  if (updatedAt.getTime() < createdAt.getTime()) {
    throw new Error(`Watchlist entry ${symbol} has updatedAt before createdAt`);
  }

  return {
    id,
    symbol,
    tradingSymbolId,
    status: record.status,
    version: record.version,
    createdAt,
    updatedAt,
  };
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Invalid ${field}`);
  }

  return normalized;
}

function cloneValidDate(value: Date, field: string, symbol: string): Date {
  const cloned = new Date(value.getTime());

  if (!Number.isFinite(cloned.getTime())) {
    throw new Error(`Invalid watchlist ${field} for ${symbol}`);
  }

  return cloned;
}
