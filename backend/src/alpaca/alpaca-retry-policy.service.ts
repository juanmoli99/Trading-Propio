import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AlpacaHttpMethod } from './alpaca-http.types';
import { AlpacaRetryClassifier } from './alpaca-retry-classifier.service';
import type { AlpacaRetryDecision } from './alpaca-retry.types';

@Injectable()
export class AlpacaRetryPolicy {
  private readonly maxRetries: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryClassifier: AlpacaRetryClassifier,
  ) {
    this.maxRetries = this.resolveMaxRetries();
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }

  evaluate(
    method: AlpacaHttpMethod,
    error: unknown,
    retriesAlreadyPerformed: number,
  ): AlpacaRetryDecision {
    if (retriesAlreadyPerformed >= this.maxRetries) {
      return {
        retry: false,
        reason: 'MAX_RETRIES_REACHED',
        retryNumber: retriesAlreadyPerformed,
        maxRetries: this.maxRetries,
      };
    }

    if (!this.isSafeMethod(method)) {
      return {
        retry: false,
        reason: 'UNSAFE_HTTP_METHOD',
        retryNumber: retriesAlreadyPerformed,
        maxRetries: this.maxRetries,
      };
    }

    const classification = this.retryClassifier.classify(error);

    if (!classification.retryable) {
      return {
        retry: false,
        reason: 'NON_RETRYABLE_ERROR',
        retryNumber: retriesAlreadyPerformed,
        maxRetries: this.maxRetries,
      };
    }

    return {
      retry: true,
      reason: 'RETRY_ALLOWED',
      retryNumber: retriesAlreadyPerformed + 1,
      maxRetries: this.maxRetries,
    };
  }

  private isSafeMethod(method: AlpacaHttpMethod): boolean {
    return method === 'GET';
  }

  private resolveMaxRetries(): number {
    const maxRetries = this.configService.get<number>('operational.maxRetries');

    if (
      maxRetries === undefined ||
      !Number.isInteger(maxRetries) ||
      maxRetries < 0 ||
      maxRetries > 10
    ) {
      throw new Error('Invalid Alpaca retry configuration');
    }

    return maxRetries;
  }
}
