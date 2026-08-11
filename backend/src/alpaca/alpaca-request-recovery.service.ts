import { Injectable } from '@nestjs/common';
import type {
  AlpacaHttpRequest,
  AlpacaHttpResponse,
} from './alpaca-http.types';
import { AlpacaCircuitBreakerService } from './alpaca-circuit-breaker.service';
import { AlpacaRateLimitService } from './alpaca-rate-limit.service';
import { AlpacaRetryBackoffService } from './alpaca-retry-backoff.service';
import { AlpacaRetryPolicy } from './alpaca-retry-policy.service';

@Injectable()
export class AlpacaRequestRecoveryService {
  constructor(
    private readonly rateLimitService: AlpacaRateLimitService,
    private readonly circuitBreaker: AlpacaCircuitBreakerService,
    private readonly retryPolicy: AlpacaRetryPolicy,
    private readonly retryBackoff: AlpacaRetryBackoffService,
  ) {}

  async execute<T>(
    request: AlpacaHttpRequest,
    operation: () => Promise<AlpacaHttpResponse<T>>,
  ): Promise<AlpacaHttpResponse<T>> {
    let retriesPerformed = 0;

    while (true) {
      await this.rateLimitService.beforeRequest(request.consumer);

      this.circuitBreaker.beforeRequest();

      try {
        const response = await operation();

        this.circuitBreaker.recordSuccess();

        return response;
      } catch (error) {
        this.circuitBreaker.recordFailure(error);

        const decision = this.retryPolicy.evaluate(
          request.method,
          error,
          retriesPerformed,
        );

        if (!decision.retry) {
          throw error;
        }

        await this.waitBeforeRetry(decision.retryNumber);

        retriesPerformed += 1;
      }
    }
  }

  private async waitBeforeRetry(retryNumber: number): Promise<void> {
    const delayMs = this.retryBackoff.calculateDelayMs(retryNumber);

    if (delayMs <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}
