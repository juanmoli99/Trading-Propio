"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const market_data_age_constants_1 = require("../src/config/market-data-age.constants");
const market_data_config_1 = __importDefault(require("../src/config/market-data.config"));
delete process.env.MARKET_DATA_MAX_AGE_MS;
const defaultConfiguration = (0, market_data_config_1.default)();
process.env.MARKET_DATA_MAX_AGE_MS = '60000';
const overriddenConfiguration = (0, market_data_config_1.default)();
delete process.env.MARKET_DATA_MAX_AGE_MS;
const assertions = {
    DEFAULT_MAX_AGE_MS: defaultConfiguration.maxAgeMs === market_data_age_constants_1.MARKET_DATA_MAX_AGE_DEFAULT_MS,
    OVERRIDE_MAX_AGE_MS: overriddenConfiguration.maxAgeMs === 60_000,
    MINIMUM_ALLOWED: market_data_age_constants_1.MARKET_DATA_MAX_AGE_MIN_MS === 1_000,
    MAXIMUM_ALLOWED: market_data_age_constants_1.MARKET_DATA_MAX_AGE_MAX_MS === 3_600_000,
    DEFAULT_WITHIN_ALLOWED_RANGE: defaultConfiguration.maxAgeMs >= market_data_age_constants_1.MARKET_DATA_MAX_AGE_MIN_MS &&
        defaultConfiguration.maxAgeMs <= market_data_age_constants_1.MARKET_DATA_MAX_AGE_MAX_MS,
    FINITE: Number.isFinite(defaultConfiguration.maxAgeMs),
    INTEGER: Number.isInteger(defaultConfiguration.maxAgeMs),
};
for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
}
if (!Object.values(assertions).every(Boolean)) {
    process.exit(1);
}
