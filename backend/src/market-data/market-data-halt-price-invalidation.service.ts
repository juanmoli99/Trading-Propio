import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from './market-data-halt-detection.service';
import type {
  HaltSensitivePrice,
  MarketDataHaltPriceInvalidationResult,
} from './market-data-halt-price-invalidation.types';

@Injectable()
export class MarketDataHaltPriceInvalidationService {
  constructor(
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  evaluate(
    price: HaltSensitivePrice,
  ): MarketDataHaltPriceInvalidationResult {
    const symbol = this.normalizeSymbol(price.symbol);
    const priceTimestamp = this.validateTimestamp(price.timestamp);

    const halt = this.haltDetectionService.detect(symbol);

    if (halt.state === 'UNKNOWN') {
      throw new Error(
        `Cannot safely validate price because halt state is unknown for ${halt.symbol}`,
      );
    }

    if (halt.state === 'NOT_HALTED') {
      return {
        symbol: halt.symbol,
        invalidated: false,
        priceTimestamp,
        haltedAt: null,
        haltReason: null,
      };
    }

    if (halt.haltedAt === null) {
      throw new Error(
        `Cannot safely validate price because halt timestamp is missing for ${halt.symbol}`,
      );
    }

    const haltedAt = new Date(halt.haltedAt);

    return {
      symbol: halt.symbol,
      invalidated:
        priceTimestamp.getTime() <= haltedAt.getTime(),
      priceTimestamp,
      haltedAt,
      haltReason: halt.haltReason
        ? { ...halt.haltReason }
        : null,
    };
  }

  assertUsable(price: HaltSensitivePrice): void {
    const result = this.evaluate(price);

    if (!result.invalidated) {
      return;
    }

    throw new Error(
      `Price for ${result.symbol} is invalid because it predates or matches the trading halt at ${result.haltedAt?.toISOString()}`,
    );
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error('Invalid halt-sensitive price symbol');
    }

    return normalized;
  }

  private validateTimestamp(timestamp: Date): Date {
    const milliseconds = timestamp.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error('Invalid halt-sensitive price timestamp');
    }

    return new Date(milliseconds);
  }
}