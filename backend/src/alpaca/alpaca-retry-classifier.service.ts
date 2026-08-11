import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AlpacaNetworkError } from './alpaca-network.error';
import { AlpacaRateLimitError } from './alpaca-rate-limit.error';
import type { AlpacaRetryClassificationResult } from './alpaca-retry-classification.types';

@Injectable()
export class AlpacaRetryClassifier {
  classify(error: unknown): AlpacaRetryClassificationResult {
    if (error instanceof AlpacaNetworkError) {
      return {
        retryable: error.retryable,
        classification: error.retryable
          ? 'NETWORK_RETRYABLE'
          : 'NETWORK_NON_RETRYABLE',
        statusCode: null,
      };
    }

    if (error instanceof AlpacaRateLimitError) {
      return {
        retryable: true,
        classification: 'RATE_LIMIT',
        statusCode: 429,
      };
    }

    if (axios.isAxiosError(error) && error.response) {
      const statusCode = error.response.status;

      if (statusCode >= 500 && statusCode <= 599) {
        return {
          retryable: true,
          classification: 'SERVER_ERROR',
          statusCode,
        };
      }

      return {
        retryable: false,
        classification: 'HTTP_NON_RETRYABLE',
        statusCode,
      };
    }

    return {
      retryable: false,
      classification: 'UNKNOWN_NON_RETRYABLE',
      statusCode: null,
    };
  }
}
