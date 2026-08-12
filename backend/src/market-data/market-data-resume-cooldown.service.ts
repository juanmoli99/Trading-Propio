import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MARKET_DATA_RESUME_COOLDOWN_MAX_MS,
  MARKET_DATA_RESUME_COOLDOWN_MIN_MS,
} from '../config/market-data-resume-cooldown.constants';
import { MarketDataHaltDetectionService } from './market-data-halt-detection.service';
import type { MarketDataResumeCooldownResult } from './market-data-resume-cooldown.types';

@Injectable()
export class MarketDataResumeCooldownService {
  constructor(
    private readonly configService: ConfigService,
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  evaluate(
    symbol: string,
    referenceTimestamp: Date = new Date(),
  ): MarketDataResumeCooldownResult {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const referenceAt = this.validateReferenceTimestamp(referenceTimestamp);
    const cooldownMs = this.getCooldownMs();

    const resume = this.haltDetectionService.detectResume(normalizedSymbol);

    if (!resume.resumed || resume.currentStatus === null) {
      throw new Error(
        `Resume cooldown requires a confirmed HALTED to NOT_HALTED transition for ${resume.symbol}`,
      );
    }

    const resumedAt = new Date(resume.currentStatus.timestamp);

    if (!Number.isFinite(resumedAt.getTime())) {
      throw new Error(
        `Resume cooldown received an invalid resume timestamp for ${resume.symbol}`,
      );
    }

    if (referenceAt.getTime() < resumedAt.getTime()) {
      throw new Error(
        `Resume cooldown reference timestamp cannot precede resume for ${resume.symbol}`,
      );
    }

    const cooldownEndsAt = new Date(resumedAt.getTime() + cooldownMs);

    const remainingMs = Math.max(
      0,
      cooldownEndsAt.getTime() - referenceAt.getTime(),
    );

    return {
      symbol: resume.symbol,
      enabled: cooldownMs > 0,
      active: cooldownMs > 0 && remainingMs > 0,
      resumedAt: new Date(resumedAt),
      cooldownMs,
      cooldownEndsAt,
      remainingMs,
    };
  }

  assertEntryAllowed(
    symbol: string,
    referenceTimestamp: Date = new Date(),
  ): void {
    const result = this.evaluate(symbol, referenceTimestamp);

    if (!result.active) {
      return;
    }

    throw new Error(
      `New entries for ${result.symbol} are blocked by post-resume cooldown until ${result.cooldownEndsAt.toISOString()} (${result.remainingMs}ms remaining)`,
    );
  }

  getCooldownMs(): number {
    const cooldownMs = this.configService.get<number>(
      'marketData.resumeCooldownMs',
    );

    if (
      cooldownMs === undefined ||
      !Number.isInteger(cooldownMs) ||
      cooldownMs < MARKET_DATA_RESUME_COOLDOWN_MIN_MS ||
      cooldownMs > MARKET_DATA_RESUME_COOLDOWN_MAX_MS
    ) {
      throw new Error('Invalid market data resume cooldown configuration');
    }

    return cooldownMs;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error('Invalid market data resume cooldown symbol');
    }

    return normalized;
  }

  private validateReferenceTimestamp(timestamp: Date): Date {
    const milliseconds = timestamp.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error('Invalid market data resume cooldown reference timestamp');
    }

    return new Date(milliseconds);
  }
}