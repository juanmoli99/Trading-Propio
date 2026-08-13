import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SetWatchlistSymbolActiveInput,
  SetWatchlistSymbolActiveResult,
} from './set-watchlist-symbol-active.types';
import { WatchlistRepository } from './watchlist.repository';

@Injectable()
export class SetWatchlistSymbolActiveService {
  constructor(private readonly watchlistRepository: WatchlistRepository) {}

  async setActive(
    input: SetWatchlistSymbolActiveInput,
  ): Promise<SetWatchlistSymbolActiveResult> {
    const symbol = normalizeTradingSymbol(input.symbol);

    if (typeof input.active !== 'boolean') {
      throw new Error('Watchlist active state must be boolean');
    }

    const existing = await this.watchlistRepository.findBySymbol(symbol);

    if (existing === null) {
      throw new Error(`Watchlist symbol ${symbol} does not exist`);
    }

    const targetStatus = input.active ? 'ACTIVE' : 'INACTIVE';

    if (existing.status === targetStatus) {
      return {
        entry: existing,
        changed: false,
      };
    }

    const updated = await this.watchlistRepository.update(existing.id, {
      status: targetStatus,
    });

    if (updated.symbol !== symbol) {
      throw new Error(
        `Updated watchlist symbol ${updated.symbol} does not match requested symbol ${symbol}`,
      );
    }

    if (updated.status !== targetStatus) {
      throw new Error(
        `Watchlist symbol ${symbol} did not persist requested status ${targetStatus}`,
      );
    }

    return {
      entry: updated,
      changed: true,
    };
  }
}
