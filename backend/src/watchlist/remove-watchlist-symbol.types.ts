import type { WatchlistEntry } from './watchlist.types';

export interface RemoveWatchlistSymbolInput {
  readonly symbol: string;
}

export interface RemoveWatchlistSymbolResult {
  readonly removed: WatchlistEntry;
}
