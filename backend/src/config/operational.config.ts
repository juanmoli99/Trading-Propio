import { registerAs } from '@nestjs/config';

export interface OperationalConfiguration {
  defaultHttpTimeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  gracefulShutdownTimeoutMs: number;
}

export default registerAs('operational', (): OperationalConfiguration => ({
  defaultHttpTimeoutMs: Number(process.env.DEFAULT_HTTP_TIMEOUT_MS ?? 10000),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 500),
  gracefulShutdownTimeoutMs: Number(
    process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? 10000,
  ),
}));
