import {
  normalizeMarketDataResponseSymbol,
  optionalMarketDataString,
  requireMarketDataDate,
  requireMarketDataString,
  requireMarketDataStringArray,
  requireNonNegativeMarketDataNumber,
} from './market-data-normalization';
import type {
  HistoricalQuotesResult,
  LatestQuoteResult,
  MarketDataQuote,
} from './market-data.types';

export interface MarketDataQuoteApiResponse {
  t?: unknown;
  ax?: unknown;
  ap?: unknown;
  as?: unknown;
  bx?: unknown;
  bp?: unknown;
  bs?: unknown;
  c?: unknown;
  z?: unknown;
}

export interface HistoricalQuotesApiResponse {
  quotes?: unknown;
  symbol?: unknown;
  next_page_token?: unknown;
}

export interface LatestQuoteApiResponse {
  quote?: unknown;
  symbol?: unknown;
}

export function normalizeHistoricalQuotes(
  value: HistoricalQuotesApiResponse,
  expectedSymbol: string,
): HistoricalQuotesResult {
  if (!Array.isArray(value.quotes)) {
    throw new Error('Invalid Alpaca historical quotes response: quotes');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    quotes: value.quotes.map((quote) =>
      normalizeMarketDataQuote(quote as MarketDataQuoteApiResponse),
    ),
    nextPageToken: optionalMarketDataString(
      value.next_page_token,
      'next_page_token',
    ),
  };
}

export function normalizeLatestQuote(
  value: LatestQuoteApiResponse,
  expectedSymbol: string,
): LatestQuoteResult {
  if (typeof value.quote !== 'object' || value.quote === null) {
    throw new Error('Invalid Alpaca latest quote response: quote');
  }

  return {
    symbol: normalizeMarketDataResponseSymbol(value.symbol, expectedSymbol),
    quote: normalizeMarketDataQuote(value.quote as MarketDataQuoteApiResponse),
  };
}

export function normalizeMarketDataQuote(
  value: MarketDataQuoteApiResponse,
): MarketDataQuote {
  const askPrice = requireNonNegativeMarketDataNumber(value.ap, 'ap');

  const bidPrice = requireNonNegativeMarketDataNumber(value.bp, 'bp');

  if (askPrice > 0 && bidPrice > 0 && askPrice < bidPrice) {
    throw new Error('Invalid Alpaca market data quote: ask is below bid');
  }

  return {
    timestamp: requireMarketDataDate(value.t, 't'),
    askExchange: requireMarketDataString(value.ax, 'ax'),
    askPrice,
    askSize: requireNonNegativeMarketDataNumber(value.as, 'as'),
    bidExchange: requireMarketDataString(value.bx, 'bx'),
    bidPrice,
    bidSize: requireNonNegativeMarketDataNumber(value.bs, 'bs'),
    conditions: requireMarketDataStringArray(value.c, 'c'),
    tape: requireMarketDataString(value.z, 'z'),
  };
}
