import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  RemoveWatchlistSymbolInput,
  RemoveWatchlistSymbolResult,
} from './remove-watchlist-symbol.types';
import { WatchlistRepository } from './watchlist.repository';

@Injectable()
export class RemoveWatchlistSymbolService {
  constructor(private readonly watchlistRepository: WatchlistRepository) {}

  async removeSymbol(
    input: RemoveWatchlistSymbolInput,
  ): Promise<RemoveWatchlistSymbolResult> {
    const symbol = normalizeTradingSymbol(input.symbol);

    const existing = await this.watchlistRepository.findBySymbol(symbol);

    if (existing === null) {
      throw new Error(`Watchlist symbol ${symbol} does not exist`);
    }

    const removed = await this.watchlistRepository.deleteById(existing.id);

    if (removed.symbol !== symbol) {
      throw new Error(
        `Removed watchlist symbol ${removed.symbol} does not match requested symbol ${symbol}`,
      );
    }

    return {
      removed,
    };
  }
}
