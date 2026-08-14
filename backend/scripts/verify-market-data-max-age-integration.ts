import { ConfigService } from '@nestjs/config';
import { MARKET_DATA_MAX_AGE_DEFAULT_MS } from '../src/config/market-data-age.constants';
import { MarketDataAgeService } from '../src/market-data/market-data-age.service';

const config = new ConfigService({
  marketData: {
    maxAgeMs: MARKET_DATA_MAX_AGE_DEFAULT_MS,
  },
});

const service = new MarketDataAgeService(config);

const reference = new Date('2026-08-12T15:00:00.000Z');

const assertions = {
  CONFIGURATION_USED:
    service.getMaxAgeMs() === MARKET_DATA_MAX_AGE_DEFAULT_MS,

  FRESH_DATA_ACCEPTED:
    service.detectTooOld(
      [{ timestamp: new Date('2026-08-12T14:59:00.000Z') }],
      undefined,
      reference,
    ).length === 0,

  DATA_EXACTLY_AT_LIMIT_ACCEPTED:
    service.detectTooOld(
      [{ timestamp: new Date('2026-08-12T14:58:00.000Z') }],
      undefined,
      reference,
    ).length === 0,

  DATA_OVER_LIMIT_DETECTED:
    service.detectTooOld(
      [{ timestamp: new Date('2026-08-12T14:57:59.999Z') }],
      undefined,
      reference,
    ).length === 1,

  EXCEEDED_AMOUNT_CORRECT:
    service.detectTooOld(
      [{ timestamp: new Date('2026-08-12T14:57:00.000Z') }],
      undefined,
      reference,
    )[0]?.exceededByMs === 60_000,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  process.exit(1);
}

