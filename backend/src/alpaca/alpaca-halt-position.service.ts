import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from '../market-data/market-data-halt-detection.service';
import { AlpacaPositionService } from './alpaca-position.service';
import type { AlpacaHaltPositionResult } from './alpaca-halt-position.types';
import type { AlpacaPosition } from './alpaca-position.types';

@Injectable()
export class AlpacaHaltPositionService {
  constructor(
    private readonly positionService: AlpacaPositionService,
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  async inspect(symbol: string): Promise<AlpacaHaltPositionResult> {
    const halt = this.haltDetectionService.detect(symbol);

    if (halt.state === 'UNKNOWN') {
      throw new Error(
        `Cannot safely classify position halt state because halt state is unknown for ${halt.symbol}`,
      );
    }

    const position = await this.positionService.getPosition(halt.symbol);

    return {
      symbol: halt.symbol,
      position: this.clonePosition(position),
      affectedByHalt: halt.state === 'HALTED',
      haltedAt:
        halt.state === 'HALTED' && halt.haltedAt
          ? new Date(halt.haltedAt)
          : null,
      haltReason:
        halt.state === 'HALTED' && halt.haltReason
          ? { ...halt.haltReason }
          : null,
    };
  }

  private clonePosition(position: AlpacaPosition): AlpacaPosition {
    return {
      ...position,
    };
  }
}