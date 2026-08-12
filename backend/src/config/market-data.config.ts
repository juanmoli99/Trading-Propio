import { registerAs } from '@nestjs/config';
import { MARKET_DATA_MAX_AGE_DEFAULT_MS } from './market-data-age.constants';

export interface MarketDataConfiguration {
  maxAgeMs: number;
}

export default registerAs(
  'marketData',
  (): MarketDataConfiguration => ({
    maxAgeMs: Number(
      process.env.MARKET_DATA_MAX_AGE_MS ?? MARKET_DATA_MAX_AGE_DEFAULT_MS,
    ),
  }),
);
