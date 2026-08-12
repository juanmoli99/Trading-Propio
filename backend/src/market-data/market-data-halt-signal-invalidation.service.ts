import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from './market-data-halt-detection.service';
import type {
  HaltSensitiveSignal,
  MarketDataHaltSignalInvalidationResult,
} from './market-data-halt-signal-invalidation.types';

@Injectable()
export class MarketDataHaltSignalInvalidationService {
  constructor(
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  evaluate(
    signal: HaltSensitiveSignal,
  ): MarketDataHaltSignalInvalidationResult {
    const symbol = this.normalizeSymbol(signal.symbol);
    const signalTimestamp = this.validateTimestamp(signal.timestamp);

    const halt = this.haltDetectionService.detect(symbol);

    if (halt.state === 'UNKNOWN') {
      throw new Error(
        `Cannot safely validate signal because halt state is unknown for ${halt.symbol}`,
      );
    }

    if (halt.state === 'NOT_HALTED') {
      return {
        symbol: halt.symbol,
        invalidated: false,
        signalTimestamp,
        haltedAt: null,
        haltReason: null,
      };
    }

    if (halt.haltedAt === null) {
      throw new Error(
        `Cannot safely validate signal because halt timestamp is missing for ${halt.symbol}`,
      );
    }

    const haltedAt = new Date(halt.haltedAt);

    return {
      symbol: halt.symbol,
      invalidated:
        signalTimestamp.getTime() <= haltedAt.getTime(),
      signalTimestamp,
      haltedAt,
      haltReason: halt.haltReason
        ? { ...halt.haltReason }
        : null,
    };
  }

  assertValid(signal: HaltSensitiveSignal): void {
    const result = this.evaluate(signal);

    if (!result.invalidated) {
      return;
    }

    throw new Error(
      `Signal for ${result.symbol} is invalid because it predates or matches the trading halt at ${result.haltedAt?.toISOString()}`,
    );
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error('Invalid halt-sensitive signal symbol');
    }

    return normalized;
  }

  private validateTimestamp(timestamp: Date): Date {
    const milliseconds = timestamp.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error('Invalid halt-sensitive signal timestamp');
    }

    return new Date(milliseconds);
  }
}