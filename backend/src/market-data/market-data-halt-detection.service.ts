import { Injectable } from '@nestjs/common';
import { MarketDataTradingStatusService } from './market-data-trading-status.service';
import type {
  MarketDataHaltDetectionResult,
  MarketDataHaltReason,
  MarketDataHaltState,
  MarketDataResumeDetectionResult,
} from './market-data-halt-detection.types';
import type { MarketDataTradingStatus } from './market-data-trading-status.types';

const CTA_HALT_CODES = new Set(['2']);

const UTP_HALT_CODES = new Set(['H', 'P']);

const CTA_NON_HALT_CODES = new Set([
  '3',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'C',
  'D',
  'E',
  'F',
]);

const UTP_NON_HALT_CODES = new Set([
  'Q',
  'T',
]);

@Injectable()
export class MarketDataHaltDetectionService {
  constructor(
    private readonly tradingStatusService: MarketDataTradingStatusService,
  ) {}

  detect(symbol: string): MarketDataHaltDetectionResult {
    const snapshot =
      this.tradingStatusService.getTradingStatus(symbol);

    if (snapshot.status === null) {
      return {
        symbol: snapshot.symbol,
        state: 'UNKNOWN',
        halted: false,
        haltedAt: null,
        haltReason: null,
        status: null,
      };
    }

    const state = this.classify(snapshot.status);

    return {
      symbol: snapshot.symbol,
      state,
      halted: state === 'HALTED',
      haltedAt:
        state === 'HALTED'
          ? new Date(snapshot.status.timestamp)
          : null,
      haltReason:
        state === 'HALTED'
          ? this.extractHaltReason(snapshot.status)
          : null,
      status: this.cloneStatus(snapshot.status),
    };
  }

  detectResume(symbol: string): MarketDataResumeDetectionResult {
    const snapshot =
      this.tradingStatusService.getTradingStatus(symbol);

    const previousState =
      snapshot.previousStatus === null
        ? 'UNKNOWN'
        : this.classify(snapshot.previousStatus);

    const currentState =
      snapshot.status === null
        ? 'UNKNOWN'
        : this.classify(snapshot.status);

    return {
      symbol: snapshot.symbol,
      resumed:
        previousState === 'HALTED' &&
        currentState === 'NOT_HALTED',
      previousState,
      currentState,
      previousStatus: snapshot.previousStatus
        ? this.cloneStatus(snapshot.previousStatus)
        : null,
      currentStatus: snapshot.status
        ? this.cloneStatus(snapshot.status)
        : null,
    };
  }

  classify(status: MarketDataTradingStatus): MarketDataHaltState {
    const tape = status.tape.trim().toUpperCase();
    const statusCode = status.statusCode.trim().toUpperCase();

    if (tape === 'A' || tape === 'B') {
      if (CTA_HALT_CODES.has(statusCode)) {
        return 'HALTED';
      }

      if (CTA_NON_HALT_CODES.has(statusCode)) {
        return 'NOT_HALTED';
      }

      return 'UNKNOWN';
    }

    if (tape === 'C' || tape === 'O') {
      if (UTP_HALT_CODES.has(statusCode)) {
        return 'HALTED';
      }

      if (UTP_NON_HALT_CODES.has(statusCode)) {
        return 'NOT_HALTED';
      }

      return 'UNKNOWN';
    }

    return 'UNKNOWN';
  }

  getHaltReason(symbol: string): MarketDataHaltReason | null {
    return this.detect(symbol).haltReason;
  }

  getHaltedAt(symbol: string): Date | null {
    const haltedAt = this.detect(symbol).haltedAt;

    return haltedAt ? new Date(haltedAt) : null;
  }

  isHalted(symbol: string): boolean {
    return this.detect(symbol).state === 'HALTED';
  }

  isResumeDetected(symbol: string): boolean {
    return this.detectResume(symbol).resumed;
  }

  assertKnownAndNotHalted(symbol: string): void {
    const result = this.detect(symbol);

    if (result.state === 'HALTED') {
      const reason = result.haltReason;

      const reasonDescription =
        reason === null
          ? 'unknown reason'
          : this.formatReason(reason);

      throw new Error(
        `Trading halted for symbol ${result.symbol}: ${reasonDescription}`,
      );
    }

    if (result.state === 'UNKNOWN') {
      throw new Error(
        `Trading halt state is unknown for symbol ${result.symbol}`,
      );
    }
  }

  private extractHaltReason(
    status: MarketDataTradingStatus,
  ): MarketDataHaltReason {
    return {
      code: status.reasonCode.trim(),
      message: status.reasonMessage.trim(),
    };
  }

  private formatReason(reason: MarketDataHaltReason): string {
    if (reason.code && reason.message) {
      return `${reason.code} - ${reason.message}`;
    }

    if (reason.message) {
      return reason.message;
    }

    if (reason.code) {
      return reason.code;
    }

    return 'reason not provided by market data feed';
  }

  private cloneStatus(
    status: MarketDataTradingStatus,
  ): MarketDataTradingStatus {
    return {
      ...status,
      timestamp: new Date(status.timestamp),
      receivedAt: new Date(status.receivedAt),
    };
  }
}