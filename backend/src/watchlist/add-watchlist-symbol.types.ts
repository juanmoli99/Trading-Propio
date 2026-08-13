import type { SymbolValidationStatus } from '../symbols/symbol-validation.types';
import type { WatchlistEntry } from './watchlist.types';

export interface AddWatchlistSymbolInput {
  readonly symbol: string;
}

export interface AddWatchlistSymbolResult {
  readonly entry: WatchlistEntry;
  readonly validationStatus: SymbolValidationStatus;
}
