import type { WatchlistEntry } from './watchlist.types';

export interface SetWatchlistSymbolActiveInput {
  readonly symbol: string;
  readonly active: boolean;
}

export interface SetWatchlistSymbolActiveResult {
  readonly entry: WatchlistEntry;
  readonly changed: boolean;
}
