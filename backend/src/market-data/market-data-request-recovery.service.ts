import { Injectable } from '@nestjs/common';
import { AlpacaCircuitBreakerService } from '../alpaca/alpaca-circuit-breaker.service';
import { AlpacaRateLimitError } from '../alpaca/alpaca-rate-limit.error';
import { AlpacaRetryBackoffService } from '../alpaca/alpaca-retry-backoff.service';
import { AlpacaRetryPolicy } from '../alpaca/alpaca-retry-policy.service';
import { MarketDataFeedRecoveryService } from './market-data-feed-recovery.service';
import { MarketDataRateLimitService } from './market-data-rate-limit.service';
import type {
  MarketDataHttpRequest,
  MarketDataHttpResponse,
} from './market-data.types';

@Injectable()
export class MarketDataRequestRecoveryService {
  constructor(
    private readonly rateLimit: MarketDataRateLimitService,
    private readonly circuitBreaker: AlpacaCircuitBreakerService,
    private readonly retryPolicy: AlpacaRetryPolicy,
    private readonly retryBackoff: AlpacaRetryBackoffService,
    private readonly feedRecovery: MarketDataFeedRecoveryService,
  ) {}

  async execute<T>(
    request: MarketDataHttpRequest,
    operation: () => Promise<MarketDataHttpResponse<T>>,
  ): Promise<MarketDataHttpResponse<T>> {
    let retriesPerformed = 0;

    while (true) {
      await this.rateLimit.beforeRequest();

      try {
        this.circuitBreaker.beforeRequest();
      } catch (error) {
        this.feedRecovery.recordUnavailable();
        throw error;
      }

      try {
        const response = await operation();

        this.circuitBreaker.recordSuccess();
        this.feedRecovery.recordSuccessfulRequest();

        return response;
      } catch (error) {
        this.circuitBreaker.recordFailure(error);

        const decision = this.retryPolicy.evaluate(
          'GET',
          error,
          retriesPerformed,
        );

        if (!decision.retry) {
          this.feedRecovery.recordUnavailable();
          throw error;
        }

        await this.waitBeforeRetry(error, decision.retryNumber);

        retriesPerformed += 1;
      }
    }
  }

  private async waitBeforeRetry(
    error: unknown,
    retryNumber: number,
  ): Promise<void> {
    if (
      error instanceof AlpacaRateLimitError &&
      error.resetAt !== null &&
      error.resetAt.getTime() > Date.now()
    ) {
      return;
    }

    const delayMs = this.retryBackoff.calculateDelayMs(retryNumber);

    if (delayMs <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}