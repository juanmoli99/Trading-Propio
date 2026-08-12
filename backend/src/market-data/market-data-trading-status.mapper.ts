import type { MarketDataFeed } from './market-data.types';
import type { MarketDataTradingStatus } from './market-data-trading-status.types';

export interface AlpacaTradingStatusMessage {
  readonly T?: unknown;
  readonly S?: unknown;
  readonly sc?: unknown;
  readonly sm?: unknown;
  readonly rc?: unknown;
  readonly rm?: unknown;
  readonly t?: unknown;
  readonly z?: unknown;
}

export function normalizeMarketDataTradingStatus(
  value: AlpacaTradingStatusMessage,
  feed: MarketDataFeed,
  receivedAt: Date = new Date(),
): MarketDataTradingStatus {
  if (value.T !== 's') {
    throw new Error('Invalid Alpaca trading status message type');
  }

  const timestamp = requireDate(value.t, 't');

  const receivedAtMs = receivedAt.getTime();

  if (!Number.isFinite(receivedAtMs)) {
    throw new Error('Invalid trading status received timestamp');
  }

  return {
    symbol: requireString(value.S, 'S').toUpperCase(),
    statusCode: requireString(value.sc, 'sc'),
    statusMessage: requireString(value.sm, 'sm', true),
    reasonCode: requireString(value.rc, 'rc', true),
    reasonMessage: requireString(value.rm, 'rm', true),
    timestamp,
    tape: requireString(value.z, 'z', true),
    feed,
    receivedAt: new Date(receivedAtMs),
  };
}

function requireString(
  value: unknown,
  field: string,
  allowEmpty = false,
): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid Alpaca trading status field: ${field}`);
  }

  const normalized = value.trim();

  if (!allowEmpty && normalized.length === 0) {
    throw new Error(`Invalid Alpaca trading status field: ${field}`);
  }

  return normalized;
}

function requireDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca trading status field: ${field}`);
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid Alpaca trading status timestamp: ${field}`);
  }

  return date;
}