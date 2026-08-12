import type { MarketDataFeed } from './market-data.types';

export type MarketDataHaltAuditEventType = 'HALT' | 'RESUME';

export interface RecordMarketDataHaltAuditInput {
  readonly type: MarketDataHaltAuditEventType;
  readonly symbol: string;
  readonly eventAt: Date;
  readonly receivedAt: Date;
  readonly statusCode: string;
  readonly statusMessage: string;
  readonly reasonCode: string;
  readonly reasonMessage: string;
  readonly tape: string;
  readonly feed: MarketDataFeed;
}

export interface MarketDataHaltAuditRecord {
  readonly id: string;
  readonly type: MarketDataHaltAuditEventType;
  readonly symbol: string;
  readonly eventAt: Date;
  readonly receivedAt: Date;
  readonly statusCode: string;
  readonly statusMessage: string;
  readonly reasonCode: string;
  readonly reasonMessage: string;
  readonly tape: string;
  readonly feed: string;
  readonly correlationId: string | null;
  readonly createdAt: Date;
}