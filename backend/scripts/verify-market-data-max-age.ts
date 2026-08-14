import {
  MARKET_DATA_MAX_AGE_DEFAULT_MS,
  MARKET_DATA_MAX_AGE_MAX_MS,
  MARKET_DATA_MAX_AGE_MIN_MS,
} from '../src/config/market-data-age.constants';
import marketDataConfig from '../src/config/market-data.config';

delete process.env.MARKET_DATA_MAX_AGE_MS;

const defaultConfiguration = marketDataConfig();

process.env.MARKET_DATA_MAX_AGE_MS = '60000';

const overriddenConfiguration = marketDataConfig();

delete process.env.MARKET_DATA_MAX_AGE_MS;

const assertions = {
  DEFAULT_MAX_AGE_MS:
    defaultConfiguration.maxAgeMs === MARKET_DATA_MAX_AGE_DEFAULT_MS,
  OVERRIDE_MAX_AGE_MS: overriddenConfiguration.maxAgeMs === 60_000,
  MINIMUM_ALLOWED: MARKET_DATA_MAX_AGE_MIN_MS === 1_000,
  MAXIMUM_ALLOWED: MARKET_DATA_MAX_AGE_MAX_MS === 3_600_000,
  DEFAULT_WITHIN_ALLOWED_RANGE:
    defaultConfiguration.maxAgeMs >= MARKET_DATA_MAX_AGE_MIN_MS &&
    defaultConfiguration.maxAgeMs <= MARKET_DATA_MAX_AGE_MAX_MS,
  FINITE: Number.isFinite(defaultConfiguration.maxAgeMs),
  INTEGER: Number.isInteger(defaultConfiguration.maxAgeMs),
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  process.exit(1);
}

