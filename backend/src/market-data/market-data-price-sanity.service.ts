import { Injectable } from '@nestjs/common';
import {
  detectMarketDataPriceSanityIssues,
  type MarketDataPricePoint,
  type MarketDataPriceSanityIssue,
} from './market-data-price-sanity';

@Injectable()
export class MarketDataPriceSanityService {
  detect(
    points: readonly MarketDataPricePoint[],
    maxPercentageChange: number,
  ): MarketDataPriceSanityIssue[] {
    return detectMarketDataPriceSanityIssues(points, maxPercentageChange);
  }
}
