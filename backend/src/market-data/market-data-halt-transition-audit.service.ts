import { Injectable } from '@nestjs/common';
import { MarketDataHaltAuditService } from './market-data-halt-audit.service';
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

const UTP_NON_HALT_CODES = new Set(['Q', 'T']);

type HaltState = 'HALTED' | 'NOT_HALTED' | 'UNKNOWN';

@Injectable()
export class MarketDataHaltTransitionAuditService {
  constructor(
    private readonly haltAuditService: MarketDataHaltAuditService,
  ) {}

  async recordAcceptedTransition(
    previous: MarketDataTradingStatus | null,
    current: MarketDataTradingStatus,
  ): Promise<void> {
    const previousState =
      previous === null ? 'UNKNOWN' : this.classify(previous);

    const currentState = this.classify(current);

    if (
      currentState === 'HALTED' &&
      previousState !== 'HALTED'
    ) {
      await this.record('HALT', current);
      return;
    }

    if (
      previousState === 'HALTED' &&
      currentState === 'NOT_HALTED'
    ) {
      await this.record('RESUME', current);
    }
  }

  private async record(
    type: 'HALT' | 'RESUME',
    status: MarketDataTradingStatus,
  ): Promise<void> {
    await this.haltAuditService.record({
      type,
      symbol: status.symbol,
      eventAt: new Date(status.timestamp),
      receivedAt: new Date(status.receivedAt),
      statusCode: status.statusCode,
      statusMessage: status.statusMessage,
      reasonCode: status.reasonCode,
      reasonMessage: status.reasonMessage,
      tape: status.tape,
      feed: status.feed,
    });
  }

  private classify(
    status: MarketDataTradingStatus,
  ): HaltState {
    const tape = status.tape.trim().toUpperCase();
    const code = status.statusCode.trim().toUpperCase();

    if (tape === 'A' || tape === 'B') {
      if (CTA_HALT_CODES.has(code)) {
        return 'HALTED';
      }

      if (CTA_NON_HALT_CODES.has(code)) {
        return 'NOT_HALTED';
      }

      return 'UNKNOWN';
    }

    if (tape === 'C' || tape === 'O') {
      if (UTP_HALT_CODES.has(code)) {
        return 'HALTED';
      }

      if (UTP_NON_HALT_CODES.has(code)) {
        return 'NOT_HALTED';
      }
    }

    return 'UNKNOWN';
  }
}