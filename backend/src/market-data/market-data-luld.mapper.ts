import type { MarketDataLuldStatus } from './market-data-luld.types';
import type { MarketDataFeed } from './market-data.types';

export interface AlpacaLuldMessage {
  readonly T?: unknown;
  readonly S?: unknown;
  readonly u?: unknown;
  readonly d?: unknown;
  readonly i?: unknown;
  readonly t?: unknown;
  readonly z?: unknown;
}

export function normalizeMarketDataLuld(
  value: AlpacaLuldMessage,
  feed: MarketDataFeed,
  receivedAt: Date = new Date(),
): MarketDataLuldStatus {
  if (value.T !== 'l') {
    throw new Error('Invalid Alpaca LULD message type');
  }

  const symbol = requireString(value.S, 'S').toUpperCase();
  const limitUp = requirePositiveNumber(value.u, 'u');
  const limitDown = requirePositiveNumber(value.d, 'd');
  const indicator = requireString(value.i, 'i');
  const timestamp = requireDate(value.t, 't');
  const tape = requireString(value.z, 'z');

  if (limitDown >= limitUp) {
    throw new Error(
      'Invalid Alpaca LULD bands: limit down must be below limit up',
    );
  }

  const receivedAtMs = receivedAt.getTime();

  if (!Number.isFinite(receivedAtMs)) {
    throw new Error('Invalid LULD received timestamp');
  }

  return {
    symbol,
    limitUp,
    limitDown,
    indicator,
    timestamp,
    tape,
    feed,
    receivedAt: new Date(receivedAtMs),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca LULD field: ${field}`);
  }

  return value.trim();
}

function requirePositiveNumber(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(`Invalid Alpaca LULD field: ${field}`);
  }

  return value;
}

function requireDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca LULD field: ${field}`);
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid Alpaca LULD timestamp: ${field}`);
  }

  return date;
}