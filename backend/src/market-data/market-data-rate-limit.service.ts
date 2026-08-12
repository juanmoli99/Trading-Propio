import { Injectable } from '@nestjs/common';
import type { MarketDataRateLimitSnapshot } from './market-data-rate-limit.types';

const RESET_SAFETY_MARGIN_MS = 50;

@Injectable()
export class MarketDataRateLimitService {
  private limit: number | null = null;

  private remaining: number | null = null;

  private resetAt: Date | null = null;

  private requests = 0;

  private waits = 0;

  private rateLimitResponses = 0;

  async beforeRequest(): Promise<void> {
    await this.waitIfExhausted();

    this.requests += 1;
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

  recordRateLimitResponse(): void {
    this.rateLimitResponses += 1;
  }

  getSnapshot(): MarketDataRateLimitSnapshot {
    return {
      limit: this.limit,
      remaining: this.remaining,
      resetAt: this.resetAt ? new Date(this.resetAt) : null,
      requests: this.requests,
      waits: this.waits,
      rateLimitResponses: this.rateLimitResponses,
    };
  }

  private async waitIfExhausted(): Promise<void> {
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
      this.clearExpiredWindow();
      return;
    }

    this.waits += 1;

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

    this.clearExpiredWindow();
  }

  private clearExpiredWindow(): void {
    this.remaining = null;
    this.resetAt = null;
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
