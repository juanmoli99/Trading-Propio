import {
  normalizeMarketDataResponseSymbol,
  optionalMarketDataString,
  requireMarketDataDate,
  requireMarketDataString,
  requireMarketDataStringArray,
  requireNonNegativeSafeMarketDataInteger,
  requirePositiveMarketDataNumber,
} from './market-data-normalization';
import type {
  HistoricalTradesResult,
  LatestTradeResult,
  MarketDataTrade,
} from './market-data.types';

export interface MarketDataTradeApiResponse {
  t?: unknown;
  x?: unknown;
  p?: unknown;
  s?: unknown;
  c?: unknown;
  i?: unknown;
  z?: unknown;
}

export interface HistoricalTradesApiResponse {
  trades?: unknown;
  symbol?: unknown;
  next_page_token?: unknown;
}

export interface LatestTradeApiResponse {
  trade?: unknown;
  symbol?: unknown;
}

export function normalizeHistoricalTrades(
  value: HistoricalTradesApiResponse,
  expectedSymbol: string,
): HistoricalTradesResult {
  if (!Array.isArray(value.trades)) {
    throw new Error('Invalid Alpaca historical trades response: trades');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    trades: value.trades.map((trade) =>
      normalizeMarketDataTrade(trade as MarketDataTradeApiResponse),
    ),
    nextPageToken: optionalMarketDataString(
      value.next_page_token,
      'next_page_token',
    ),
  };
}

export function normalizeLatestTrade(
  value: LatestTradeApiResponse,
  expectedSymbol: string,
): LatestTradeResult {
  if (typeof value.trade !== 'object' || value.trade === null) {
    throw new Error('Invalid Alpaca latest trade response: trade');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    trade: normalizeMarketDataTrade(value.trade as MarketDataTradeApiResponse),
  };
}

export function normalizeMarketDataTrade(
  value: MarketDataTradeApiResponse,
): MarketDataTrade {
  return {
    timestamp: requireMarketDataDate(value.t, 't'),
    exchange: requireMarketDataString(value.x, 'x'),
    price: requirePositiveMarketDataNumber(value.p, 'p'),
    size: requirePositiveMarketDataNumber(value.s, 's'),
    conditions: requireMarketDataStringArray(value.c, 'c'),
    id: requireNonNegativeSafeMarketDataInteger(value.i, 'i'),
    tape: requireMarketDataString(value.z, 'z'),
  };
}
