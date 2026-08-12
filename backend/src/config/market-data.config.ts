import { registerAs } from '@nestjs/config';
import { MARKET_DATA_MAX_AGE_DEFAULT_MS } from './market-data-age.constants';
import { MARKET_DATA_RESUME_COOLDOWN_DEFAULT_MS } from './market-data-resume-cooldown.constants';

export interface MarketDataConfiguration {
  maxAgeMs: number;
  resumeCooldownMs: number;
}

export default registerAs(
  'marketData',
  (): MarketDataConfiguration => ({
    maxAgeMs: Number(
      process.env.MARKET_DATA_MAX_AGE_MS ?? MARKET_DATA_MAX_AGE_DEFAULT_MS,
    ),
    resumeCooldownMs: Number(
      process.env.MARKET_DATA_RESUME_COOLDOWN_MS ??
        MARKET_DATA_RESUME_COOLDOWN_DEFAULT_MS,
    ),
  }),
);