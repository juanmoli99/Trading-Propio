import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MARKET_DATA_MAX_AGE_MAX_MS,
  MARKET_DATA_MAX_AGE_MIN_MS,
} from '../config/market-data-age.constants';
import { detectTooOldMarketData } from './market-data-too-old';
import type {
  MarketDataTooOldItem,
  TimestampedMarketData,
} from './market-data-too-old';

@Injectable()
export class MarketDataAgeService {
  constructor(private readonly configService: ConfigService) {}

  detectTooOld<T extends TimestampedMarketData>(
    items: readonly T[],
    maxAgeMs: number = this.getMaxAgeMs(),
    referenceTimestamp: Date = new Date(),
  ): MarketDataTooOldItem[] {
    return detectTooOldMarketData(items, referenceTimestamp, maxAgeMs);
  }

  getMaxAgeMs(): number {
    const maxAgeMs = this.configService.get<number>('marketData.maxAgeMs');

    if (
      maxAgeMs === undefined ||
      !Number.isInteger(maxAgeMs) ||
      maxAgeMs < MARKET_DATA_MAX_AGE_MIN_MS ||
      maxAgeMs > MARKET_DATA_MAX_AGE_MAX_MS
    ) {
      throw new Error('Invalid market data maximum age configuration');
    }

    return maxAgeMs;
  }
}
