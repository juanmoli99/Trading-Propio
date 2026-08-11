import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_BACKOFF_DELAY_MS = 60_000;

@Injectable()
export class AlpacaRetryBackoffService {
  private readonly baseDelayMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseDelayMs = this.resolveBaseDelayMs();
  }

  getBaseDelayMs(): number {
    return this.baseDelayMs;
  }

  calculateDelayMs(retryNumber: number): number {
    this.validateRetryNumber(retryNumber);

    const exponentialDelay = this.calculateExponentialDelayMs(retryNumber);

    return Math.floor(Math.random() * (exponentialDelay + 1));
  }

  calculateMaximumDelayMs(retryNumber: number): number {
    this.validateRetryNumber(retryNumber);

    return this.calculateExponentialDelayMs(retryNumber);
  }

  private calculateExponentialDelayMs(retryNumber: number): number {
    const exponentialDelay = this.baseDelayMs * 2 ** (retryNumber - 1);

    if (!Number.isFinite(exponentialDelay)) {
      return MAX_BACKOFF_DELAY_MS;
    }

    return Math.min(exponentialDelay, MAX_BACKOFF_DELAY_MS);
  }

  private validateRetryNumber(retryNumber: number): void {
    if (!Number.isInteger(retryNumber) || retryNumber < 1) {
      throw new Error('Alpaca retry number must be a positive integer');
    }
  }

  private resolveBaseDelayMs(): number {
    const value = this.configService.get<number>(
      'operational.retryBaseDelayMs',
    );

    if (
      value === undefined ||
      !Number.isInteger(value) ||
      value < 10 ||
      value > 60_000
    ) {
      throw new Error('Invalid Alpaca retry base delay configuration');
    }

    return value;
  }
}
