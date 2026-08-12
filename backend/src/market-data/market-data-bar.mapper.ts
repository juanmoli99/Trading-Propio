import {
  normalizeMarketDataResponseSymbol,
  optionalMarketDataString,
  requireMarketDataDate,
  requireNonNegativeMarketDataInteger,
  requireNonNegativeSafeMarketDataInteger,
  requirePositiveMarketDataNumber,
} from './market-data-normalization';
import type {
  HistoricalBarsResult,
  LatestBarResult,
  MarketDataBar,
} from './market-data.types';

export interface MarketDataBarApiResponse {
  t?: unknown;
  o?: unknown;
  h?: unknown;
  l?: unknown;
  c?: unknown;
  v?: unknown;
  n?: unknown;
  vw?: unknown;
}

export interface HistoricalBarsApiResponse {
  bars?: unknown;
  symbol?: unknown;
  next_page_token?: unknown;
}

export interface LatestBarApiResponse {
  bar?: unknown;
  symbol?: unknown;
}

export function normalizeHistoricalBars(
  value: HistoricalBarsApiResponse,
  expectedSymbol: string,
): HistoricalBarsResult {
  if (!Array.isArray(value.bars)) {
    throw new Error('Invalid Alpaca historical bars response: bars');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    bars: value.bars.map((bar) =>
      normalizeMarketDataBar(bar as MarketDataBarApiResponse),
    ),
    nextPageToken: optionalMarketDataString(
      value.next_page_token,
      'next_page_token',
    ),
    missingBarGaps: [],
    futureBars: [],
  };
}

export function normalizeLatestBar(
  value: LatestBarApiResponse,
  expectedSymbol: string,
): LatestBarResult {
  if (typeof value.bar !== 'object' || value.bar === null) {
    throw new Error('Invalid Alpaca latest bar response: bar');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    bar: normalizeMarketDataBar(value.bar as MarketDataBarApiResponse),
    futureBars: [],
  };
}

export function normalizeMarketDataBar(
  value: MarketDataBarApiResponse,
): MarketDataBar {
  const open = requirePositiveMarketDataNumber(value.o, 'o');

  const high = requirePositiveMarketDataNumber(value.h, 'h');

  const low = requirePositiveMarketDataNumber(value.l, 'l');

  const close = requirePositiveMarketDataNumber(value.c, 'c');

  if (high < low) {
    throw new Error('Invalid Alpaca market data bar: high is below low');
  }

  if (open > high || open < low || close > high || close < low) {
    throw new Error('Invalid Alpaca market data bar: OHLC is inconsistent');
  }

  return {
    timestamp: requireMarketDataDate(value.t, 't'),
    open,
    high,
    low,
    close,
    volume: requireNonNegativeSafeMarketDataInteger(value.v, 'v'),
    tradeCount: requireNonNegativeMarketDataInteger(value.n, 'n'),
    vwap: requirePositiveMarketDataNumber(value.vw, 'vw'),
  };
}
