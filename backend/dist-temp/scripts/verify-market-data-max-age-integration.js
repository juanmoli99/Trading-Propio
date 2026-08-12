"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const market_data_age_constants_1 = require("../src/config/market-data-age.constants");
const market_data_age_service_1 = require("../src/market-data/market-data-age.service");
const config = new config_1.ConfigService({
    marketData: {
        maxAgeMs: market_data_age_constants_1.MARKET_DATA_MAX_AGE_DEFAULT_MS,
    },
});
const service = new market_data_age_service_1.MarketDataAgeService(config);
const reference = new Date('2026-08-12T15:00:00.000Z');
const assertions = {
    CONFIGURATION_USED: service.getMaxAgeMs() === market_data_age_constants_1.MARKET_DATA_MAX_AGE_DEFAULT_MS,
    FRESH_DATA_ACCEPTED: service.detectTooOld([{ timestamp: new Date('2026-08-12T14:59:00.000Z') }], undefined, reference).length === 0,
    DATA_EXACTLY_AT_LIMIT_ACCEPTED: service.detectTooOld([{ timestamp: new Date('2026-08-12T14:58:00.000Z') }], undefined, reference).length === 0,
    DATA_OVER_LIMIT_DETECTED: service.detectTooOld([{ timestamp: new Date('2026-08-12T14:57:59.999Z') }], undefined, reference).length === 1,
    EXCEEDED_AMOUNT_CORRECT: service.detectTooOld([{ timestamp: new Date('2026-08-12T14:57:00.000Z') }], undefined, reference)[0]?.exceededByMs === 60_000,
};
for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
}
if (!Object.values(assertions).every(Boolean)) {
    process.exit(1);
}
