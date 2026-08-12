import { Injectable } from '@nestjs/common';
import { CorrelationContextService } from '../common/correlation/correlation-context.service';
import { PrismaService } from '../database/prisma.service';
import type { MarketDataAnomalyType } from '../generated/prisma/enums';

export interface RecordMarketDataAnomalyInput {
  readonly type: MarketDataAnomalyType;
  readonly symbol?: string;
  readonly timestamp?: Date;
  readonly referenceAt?: Date;
  readonly details: Record<string, string | number | boolean | null>;
}

@Injectable()
export class MarketDataAnomalyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  async record(input: RecordMarketDataAnomalyInput): Promise<void> {
    this.validateDate(input.timestamp, 'timestamp');
    this.validateDate(input.referenceAt, 'referenceAt');

    const correlationId = this.correlationContext.getCorrelationId();

    await this.prisma.marketDataAnomaly.create({
      data: {
        type: input.type,
        symbol: input.symbol,
        timestamp: input.timestamp,
        referenceAt: input.referenceAt,
        details: input.details,
        correlationId,
      },
    });
  }

  private validateDate(value: Date | undefined, field: string): void {
    if (value === undefined) {
      return;
    }

    if (!Number.isFinite(value.getTime())) {
      throw new Error(`Invalid market data anomaly ${field}`);
    }
  }
}
