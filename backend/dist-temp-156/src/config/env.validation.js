"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveTradingConfirmation = exports.baseCurrencies = exports.tradingModes = exports.environmentNames = void 0;
exports.validateEnvironment = validateEnvironment;
const zod_1 = require("zod");
const market_data_age_constants_1 = require("./market-data-age.constants");
exports.environmentNames = [
    'development',
    'staging',
    'production',
];
exports.tradingModes = ['PAPER', 'LIVE'];
exports.baseCurrencies = ['USD'];
exports.liveTradingConfirmation = 'I_UNDERSTAND_LIVE_TRADING_USES_REAL_MONEY';
const timeZoneSchema = zod_1.z.string().superRefine((value, context) => {
    try {
        new Intl.DateTimeFormat('en-US', {
            timeZone: value,
        }).format();
    }
    catch {
        context.addIssue({
            code: 'custom',
            message: 'must be a valid IANA timezone',
        });
    }
});
const environmentSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(exports.environmentNames).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(3000),
    TRADING_MODE: zod_1.z.enum(exports.tradingModes).default('PAPER'),
    APP_TIMEZONE: timeZoneSchema.default('UTC'),
    BASE_CURRENCY: zod_1.z.enum(exports.baseCurrencies).default('USD'),
    MARKET_DATA_MAX_AGE_MS: zod_1.z.coerce
        .number()
        .int()
        .min(market_data_age_constants_1.MARKET_DATA_MAX_AGE_MIN_MS)
        .max(market_data_age_constants_1.MARKET_DATA_MAX_AGE_MAX_MS)
        .default(market_data_age_constants_1.MARKET_DATA_MAX_AGE_DEFAULT_MS),
    DATABASE_URL: zod_1.z.url(),
    DIRECT_URL: zod_1.z.url(),
    DEFAULT_HTTP_TIMEOUT_MS: zod_1.z.coerce
        .number()
        .int()
        .min(100)
        .max(120000)
        .default(10000),
    MAX_RETRIES: zod_1.z.coerce.number().int().min(0).max(10).default(3),
    RETRY_BASE_DELAY_MS: zod_1.z.coerce
        .number()
        .int()
        .min(10)
        .max(60000)
        .default(500),
    GRACEFUL_SHUTDOWN_TIMEOUT_MS: zod_1.z.coerce
        .number()
        .int()
        .min(1000)
        .max(120000)
        .default(10000),
    ALPACA_CIRCUIT_BREAKER_FAILURE_THRESHOLD: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(5),
    ALPACA_CIRCUIT_BREAKER_OPEN_MS: zod_1.z.coerce
        .number()
        .int()
        .min(1000)
        .max(300000)
        .default(30000),
    ALPACA_PAPER_API_KEY: zod_1.z.string().min(1).optional(),
    ALPACA_PAPER_API_SECRET: zod_1.z.string().min(1).optional(),
    ALPACA_PAPER_BASE_URL: zod_1.z
        .url()
        .default('https://paper-api.alpaca.markets'),
    ALPACA_LIVE_API_KEY: zod_1.z.string().min(1).optional(),
    ALPACA_LIVE_API_SECRET: zod_1.z.string().min(1).optional(),
    ALPACA_LIVE_BASE_URL: zod_1.z.url().default('https://api.alpaca.markets'),
    ENABLE_LIVE_TRADING: zod_1.z.enum(['true', 'false']).default('false'),
    LIVE_TRADING_CONFIRMATION: zod_1.z.string().optional(),
    SINGLE_OPERATOR_USERNAME: zod_1.z.string().min(1).optional(),
    SINGLE_OPERATOR_DISPLAY_NAME: zod_1.z.string().min(1).optional(),
    SINGLE_OPERATOR_BOOTSTRAP_PASSWORD: zod_1.z.string().min(12).optional(),
    CORS_ALLOWED_ORIGINS: zod_1.z.string().optional(),
    HARD_CAP_MAX_ORDER_NOTIONAL: zod_1.z.coerce
        .number()
        .positive()
        .finite()
        .default(1000),
    HARD_CAP_MAX_TOTAL_CAPITAL: zod_1.z.coerce
        .number()
        .positive()
        .finite()
        .default(5000),
    HARD_CAP_MAX_DAILY_LOSS: zod_1.z.coerce.number().positive().finite().default(200),
    HARD_CAP_MAX_DRAWDOWN_PERCENT: zod_1.z.coerce
        .number()
        .positive()
        .max(100)
        .finite()
        .default(10),
})
    .superRefine((config, context) => {
    if (config.TRADING_MODE === 'PAPER') {
        if (!config.ALPACA_PAPER_API_KEY) {
            context.addIssue({
                code: 'custom',
                path: ['ALPACA_PAPER_API_KEY'],
                message: 'is required for PAPER trading',
            });
        }
        if (!config.ALPACA_PAPER_API_SECRET) {
            context.addIssue({
                code: 'custom',
                path: ['ALPACA_PAPER_API_SECRET'],
                message: 'is required for PAPER trading',
            });
        }
        return;
    }
    if (config.NODE_ENV !== 'production') {
        context.addIssue({
            code: 'custom',
            path: ['NODE_ENV'],
            message: 'LIVE trading is only allowed in production',
        });
    }
    if (config.ENABLE_LIVE_TRADING !== 'true') {
        context.addIssue({
            code: 'custom',
            path: ['ENABLE_LIVE_TRADING'],
            message: 'must be explicitly set to "true" for LIVE trading',
        });
    }
    if (config.LIVE_TRADING_CONFIRMATION !== exports.liveTradingConfirmation) {
        context.addIssue({
            code: 'custom',
            path: ['LIVE_TRADING_CONFIRMATION'],
            message: 'does not contain the required LIVE trading confirmation',
        });
    }
    if (!config.ALPACA_LIVE_API_KEY) {
        context.addIssue({
            code: 'custom',
            path: ['ALPACA_LIVE_API_KEY'],
            message: 'is required for LIVE trading',
        });
    }
    if (!config.ALPACA_LIVE_API_SECRET) {
        context.addIssue({
            code: 'custom',
            path: ['ALPACA_LIVE_API_SECRET'],
            message: 'is required for LIVE trading',
        });
    }
});
function validateEnvironment(config) {
    const result = environmentSchema.safeParse(config);
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid environment configuration: ${details}`);
    }
    return result.data;
}
