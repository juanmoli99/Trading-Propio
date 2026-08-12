import type {
  MarketDataBar,
  MarketDataQuote,
  MarketDataTrade,
} from './market-data.types';

export function validateNoDuplicateBars(bars: readonly MarketDataBar[]): void {
  validateUnique(bars, (bar) => bar.timestamp.getTime().toString(), 'bar');
}

export function validateNoDuplicateTrades(
  trades: readonly MarketDataTrade[],
): void {
  validateUnique(trades, (trade) => trade.id.toString(), 'trade');
}

export function validateNoDuplicateQuotes(
  quotes: readonly MarketDataQuote[],
): void {
  validateUnique(
    quotes,
    (quote) =>
      JSON.stringify({
        timestamp: quote.timestamp.getTime(),
        askExchange: quote.askExchange,
        askPrice: quote.askPrice,
        askSize: quote.askSize,
        bidExchange: quote.bidExchange,
        bidPrice: quote.bidPrice,
        bidSize: quote.bidSize,
        conditions: quote.conditions,
        tape: quote.tape,
      }),
    'quote',
  );
}

function validateUnique<T>(
  items: readonly T[],
  keySelector: (item: T) => string,
  entity: string,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    const key = keySelector(item);

    if (seen.has(key)) {
      throw new Error(`Duplicate Alpaca market data ${entity} detected`);
    }

    seen.add(key);
  }
}
