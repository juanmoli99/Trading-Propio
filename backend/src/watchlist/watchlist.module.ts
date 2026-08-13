import { Module } from '@nestjs/common';
import { AddWatchlistSymbolService } from './add-watchlist-symbol.service';
import { RemoveWatchlistSymbolService } from './remove-watchlist-symbol.service';
import { SetWatchlistSymbolActiveService } from './set-watchlist-symbol-active.service';
import { SymbolBlacklistService } from './symbol-blacklist.service';
import { SymbolBlockStateService } from './symbol-block-state.service';
import { SymbolDollarVolumeFilterService } from './symbol-dollar-volume-filter.service';
import { SymbolLiquidityFilterService } from './symbol-liquidity-filter.service';
import { SymbolPriceFilterService } from './symbol-price-filter.service';
import { SymbolSpreadFilterService } from './symbol-spread-filter.service';
import { SymbolSuspensionFilterService } from './symbol-suspension-filter.service';
import { SymbolTemporaryBlockExpirationService } from './symbol-temporary-block-expiration.service';
import { SymbolTemporaryBlockService } from './symbol-temporary-block.service';
import { SymbolTradableFilterService } from './symbol-tradable-filter.service';
import { SymbolVolumeFilterService } from './symbol-volume-filter.service';
import { SymbolWhitelistService } from './symbol-whitelist.service';
import { WatchlistRepository } from './watchlist.repository';

@Module({
  providers: [AddWatchlistSymbolService, WatchlistRepository],
  exports: [AddWatchlistSymbolService, WatchlistRepository],
})
export class WatchlistModule {}
