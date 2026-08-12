import { Injectable } from '@nestjs/common';
import { detectFutureMarketDataBars } from './market-data-future-bars';
import type { MarketDataBar, MarketDataFutureBar } from './market-data.types';

@Injectable()
export class MarketDataFutureBarsService {
  detect(
    bars: readonly MarketDataBar[],
    referenceTimestamp: Date = new Date(),
  ): MarketDataFutureBar[] {
    return detectFutureMarketDataBars(bars, referenceTimestamp);
  }
}
