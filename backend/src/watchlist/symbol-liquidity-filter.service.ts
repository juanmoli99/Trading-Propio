import { Injectable } from '@nestjs/common';
import { SymbolDollarVolumeFilterService } from './symbol-dollar-volume-filter.service';
import { SymbolVolumeFilterService } from './symbol-volume-filter.service';
import type {
  SymbolLiquidityFilterQuery,
  SymbolLiquidityFilterResult,
} from './symbol-liquidity-filter.types';

@Injectable()
export class SymbolLiquidityFilterService {
  constructor(
    private readonly volumeFilter: SymbolVolumeFilterService,
    private readonly dollarVolumeFilter: SymbolDollarVolumeFilterService,
  ) {}

  evaluate(query: SymbolLiquidityFilterQuery): SymbolLiquidityFilterResult {
    const volumeResult = this.volumeFilter.evaluate({
      symbol: query.symbol,
      volume: query.volume,
      minimumVolume: query.minimumVolume,
    });

    const dollarVolumeResult = this.dollarVolumeFilter.evaluate({
      symbol: query.symbol,
      price: query.price,
      volume: query.volume,
      minimumDollarVolume: query.minimumDollarVolume,
    });

    if (volumeResult.symbol !== dollarVolumeResult.symbol) {
      throw new Error(
        'Liquidity filter received inconsistent normalized symbols',
      );
    }

    if (!volumeResult.allowed) {
      return {
        symbol: volumeResult.symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume: dollarVolumeResult.dollarVolume,
        minimumVolume: volumeResult.minimumVolume,
        minimumDollarVolume: dollarVolumeResult.minimumDollarVolume,
        allowed: false,
        status: 'VOLUME_FILTER_FAILED',
        volumeStatus: volumeResult.status,
        dollarVolumeStatus: dollarVolumeResult.status,
        reason: `Volume filter failed: ${volumeResult.status} - ${volumeResult.reason}`,
      };
    }

    if (!dollarVolumeResult.allowed) {
      return {
        symbol: volumeResult.symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume: dollarVolumeResult.dollarVolume,
        minimumVolume: volumeResult.minimumVolume,
        minimumDollarVolume: dollarVolumeResult.minimumDollarVolume,
        allowed: false,
        status: 'DOLLAR_VOLUME_FILTER_FAILED',
        volumeStatus: volumeResult.status,
        dollarVolumeStatus: dollarVolumeResult.status,
        reason: `Dollar volume filter failed: ${dollarVolumeResult.status} - ${dollarVolumeResult.reason}`,
      };
    }

    return {
      symbol: volumeResult.symbol,
      price: query.price,
      volume: query.volume,
      dollarVolume: dollarVolumeResult.dollarVolume,
      minimumVolume: volumeResult.minimumVolume,
      minimumDollarVolume: dollarVolumeResult.minimumDollarVolume,
      allowed: true,
      status: 'ALLOWED',
      volumeStatus: volumeResult.status,
      dollarVolumeStatus: dollarVolumeResult.status,
      reason: 'Symbol meets configured liquidity requirements',
    };
  }

  assertAllowed(query: SymbolLiquidityFilterQuery): void {
    const result = this.evaluate(query);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed liquidity filter: ${result.status} - ${result.reason}`,
    );
  }
}
