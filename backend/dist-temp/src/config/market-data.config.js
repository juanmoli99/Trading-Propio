"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const market_data_age_constants_1 = require("./market-data-age.constants");
exports.default = (0, config_1.registerAs)('marketData', () => ({
    maxAgeMs: Number(process.env.MARKET_DATA_MAX_AGE_MS ?? market_data_age_constants_1.MARKET_DATA_MAX_AGE_DEFAULT_MS),
}));
