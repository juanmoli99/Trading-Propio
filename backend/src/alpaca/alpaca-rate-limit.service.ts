import { Injectable } from '@nestjs/common';
import type {
  AlpacaRateLimitConsumer,
  AlpacaSharedRateLimitSnapshot,
} from './alpaca-shared-rate-limit.types';
import type { AlpacaRateLimitSnapshot } from './alpaca-rate-limit.types';

const RESET_SAFETY_MARGIN_MS = 50;

@Injectable()
export class AlpacaRateLimitService {
  private limit: number | null = null;

  private remaining: number | null = null;

  private resetAt: Date | null = null;

  private readonly consumerRequests = new Map<AlpacaRateLimitConsumer, number>([
    ['SCANNER', 0],
    ['MARKET_DATA', 0],
    ['EXECUTOR', 0],
    ['SYSTEM', 0],
  ]);

  private readonly consumerLastRequestAt = new Map<
    AlpacaRateLimitConsumer,
    Date | null
  >([
    ['SCANNER', null],
    ['MARKET_DATA', null],
    ['EXECUTOR', null],
    ['SYSTEM', null],
  ]);

  getSnapshot(): AlpacaRateLimitSnapshot {
    return {
      limit: this.limit,
      remaining: this.remaining,
      resetAt: this.resetAt ? new Date(this.resetAt) : null,
    };
  }

  getSharedSnapshot(): AlpacaSharedRateLimitSnapshot {
    return {
      limit: this.limit,
      remaining: this.remaining,
      resetAt: this.resetAt ? new Date(this.resetAt) : null,
      consumers: {
        SCANNER: this.getConsumerUsage('SCANNER'),
        MARKET_DATA: this.getConsumerUsage('MARKET_DATA'),
        EXECUTOR: this.getConsumerUsage('EXECUTOR'),
        SYSTEM: this.getConsumerUsage('SYSTEM'),
      },
    };
  }

  async beforeRequest(consumer: AlpacaRateLimitConsumer): Promise<void> {
    await this.waitIfExhausted();

    this.consumerRequests.set(
      consumer,
      (this.consumerRequests.get(consumer) ?? 0) + 1,
    );

    this.consumerLastRequestAt.set(consumer, new Date());
  }

  updateFromHeaders(headers: Readonly<Record<string, string>>): void {
    const limit = this.parseInteger(
      this.readHeader(headers, 'x-ratelimit-limit'),
    );

    const remaining = this.parseInteger(
      this.readHeader(headers, 'x-ratelimit-remaining'),
    );

    const resetAt = this.parseResetAt(
      this.readHeader(headers, 'x-ratelimit-reset'),
    );

    if (limit !== null) {
      this.limit = limit;
    }

    if (remaining !== null) {
      this.remaining = remaining;
    }

    if (resetAt !== null) {
      this.resetAt = resetAt;
    }
  }

  async waitIfExhausted(): Promise<void> {
    if (
      this.remaining === null ||
      this.remaining > 0 ||
      this.resetAt === null
    ) {
      return;
    }

    const delayMs =
      this.resetAt.getTime() - Date.now() + RESET_SAFETY_MARGIN_MS;

    if (delayMs <= 0) {
      this.remaining = null;
      this.resetAt = null;
      return;
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, delayMs);

      timer.unref?.();
    });

    this.remaining = null;
    this.resetAt = null;
  }

  private getConsumerUsage(consumer: AlpacaRateLimitConsumer) {
    const lastRequestAt = this.consumerLastRequestAt.get(consumer) ?? null;

    return {
      requests: this.consumerRequests.get(consumer) ?? 0,
      lastRequestAt: lastRequestAt ? new Date(lastRequestAt) : null,
    };
  }

  private readHeader(
    headers: Readonly<Record<string, string>>,
    target: string,
  ): string | undefined {
    const entry = Object.entries(headers).find(
      ([name]) => name.toLowerCase() === target,
    );

    return entry?.[1];
  }

  private parseInteger(value: string | undefined): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private parseResetAt(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const numeric = Number(value);

    if (Number.isFinite(numeric) && numeric > 0) {
      const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;

      const date = new Date(milliseconds);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
