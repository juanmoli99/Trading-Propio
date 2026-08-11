import { z } from 'zod';

export const environmentNames = [
  'development',
  'staging',
  'production',
] as const;

export const tradingModes = ['PAPER', 'LIVE'] as const;

export const baseCurrencies = ['USD'] as const;

export const liveTradingConfirmation =
  'I_UNDERSTAND_LIVE_TRADING_USES_REAL_MONEY';

export type EnvironmentName = (typeof environmentNames)[number];
export type TradingMode = (typeof tradingModes)[number];
export type BaseCurrency = (typeof baseCurrencies)[number];

const timeZoneSchema = z.string().superRefine((value, context) => {
  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).format();
  } catch {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid IANA timezone',
    });
  }
});

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(environmentNames).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    TRADING_MODE: z.enum(tradingModes).default('PAPER'),
    APP_TIMEZONE: timeZoneSchema.default('UTC'),
    BASE_CURRENCY: z.enum(baseCurrencies).default('USD'),

    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),

    DEFAULT_HTTP_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(120000)
      .default(10000),

    MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

    RETRY_BASE_DELAY_MS: z.coerce
      .number()
      .int()
      .min(10)
      .max(60000)
      .default(500),

    GRACEFUL_SHUTDOWN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(120000)
      .default(10000),

    ALPACA_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(5),

    ALPACA_CIRCUIT_BREAKER_OPEN_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(300000)
      .default(30000),

    ALPACA_PAPER_API_KEY: z.string().min(1).optional(),
    ALPACA_PAPER_API_SECRET: z.string().min(1).optional(),
    ALPACA_PAPER_BASE_URL: z.url().default('https://paper-api.alpaca.markets'),

    ALPACA_LIVE_API_KEY: z.string().min(1).optional(),
    ALPACA_LIVE_API_SECRET: z.string().min(1).optional(),
    ALPACA_LIVE_BASE_URL: z.url().default('https://api.alpaca.markets'),

    ENABLE_LIVE_TRADING: z.enum(['true', 'false']).default('false'),
    LIVE_TRADING_CONFIRMATION: z.string().optional(),

    SINGLE_OPERATOR_USERNAME: z.string().min(1).optional(),
    SINGLE_OPERATOR_DISPLAY_NAME: z.string().min(1).optional(),
    SINGLE_OPERATOR_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),

    HARD_CAP_MAX_ORDER_NOTIONAL: z.coerce
      .number()
      .positive()
      .finite()
      .default(1000),

    HARD_CAP_MAX_TOTAL_CAPITAL: z.coerce
      .number()
      .positive()
      .finite()
      .default(5000),

    HARD_CAP_MAX_DAILY_LOSS: z.coerce.number().positive().finite().default(200),

    HARD_CAP_MAX_DRAWDOWN_PERCENT: z.coerce
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

    if (config.LIVE_TRADING_CONFIRMATION !== liveTradingConfirmation) {
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

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
