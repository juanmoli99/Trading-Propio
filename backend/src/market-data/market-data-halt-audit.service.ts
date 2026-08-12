import { Injectable } from '@nestjs/common';
import { CorrelationContextService } from '../common/correlation/correlation-context.service';
import { PrismaService } from '../database/prisma.service';
import type {
  MarketDataHaltAuditRecord,
  RecordMarketDataHaltAuditInput,
} from './market-data-halt-audit.types';

@Injectable()
export class MarketDataHaltAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  async record(
    input: RecordMarketDataHaltAuditInput,
  ): Promise<MarketDataHaltAuditRecord> {
    const normalized = this.normalizeInput(input);

    const event = await this.prisma.marketDataHaltEvent.create({
      data: {
        type: normalized.type,
        symbol: normalized.symbol,
        eventAt: normalized.eventAt,
        receivedAt: normalized.receivedAt,
        statusCode: normalized.statusCode,
        statusMessage: normalized.statusMessage,
        reasonCode: normalized.reasonCode,
        reasonMessage: normalized.reasonMessage,
        tape: normalized.tape,
        feed: normalized.feed,
        correlationId: this.correlationContext.getCorrelationId(),
      },
    });

    return {
      id: event.id,
      type: event.type,
      symbol: event.symbol,
      eventAt: new Date(event.eventAt),
      receivedAt: new Date(event.receivedAt),
      statusCode: event.statusCode,
      statusMessage: event.statusMessage,
      reasonCode: event.reasonCode,
      reasonMessage: event.reasonMessage,
      tape: event.tape,
      feed: event.feed,
      correlationId: event.correlationId,
      createdAt: new Date(event.createdAt),
    };
  }

  private normalizeInput(
    input: RecordMarketDataHaltAuditInput,
  ): RecordMarketDataHaltAuditInput {
    const symbol = input.symbol.trim().toUpperCase();

    if (
      !symbol ||
      symbol.length > 32 ||
      /\s/.test(symbol)
    ) {
      throw new Error('Invalid market data halt audit symbol');
    }

    if (input.type !== 'HALT' && input.type !== 'RESUME') {
      throw new Error('Invalid market data halt audit event type');
    }

    const eventAt = this.validateDate(input.eventAt, 'eventAt');
    const receivedAt = this.validateDate(
      input.receivedAt,
      'receivedAt',
    );

    if (receivedAt.getTime() < eventAt.getTime()) {
      throw new Error(
        'Market data halt audit receivedAt cannot precede eventAt',
      );
    }

    return {
      type: input.type,
      symbol,
      eventAt,
      receivedAt,
      statusCode: this.normalizeRequiredString(
        input.statusCode,
        'statusCode',
      ),
      statusMessage: input.statusMessage.trim(),
      reasonCode: input.reasonCode.trim(),
      reasonMessage: input.reasonMessage.trim(),
      tape: input.tape.trim().toUpperCase(),
      feed: input.feed,
    };
  }

  private validateDate(value: Date, field: string): Date {
    const milliseconds = value.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error(
        `Invalid market data halt audit ${field}`,
      );
    }

    return new Date(milliseconds);
  }

  private normalizeRequiredString(
    value: string,
    field: string,
  ): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        `Invalid market data halt audit ${field}`,
      );
    }

    return normalized;
  }
}