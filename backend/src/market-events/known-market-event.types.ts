import type { CorporateActionType } from '../corporate-actions/corporate-actions.types';

export const KNOWN_MARKET_EVENT_KINDS = [
  'EARNINGS',
  'CORPORATE_ACTION',
] as const;

export type KnownMarketEventKind = (typeof KNOWN_MARKET_EVENT_KINDS)[number];

export interface KnownEarningsMarketEvent {
  readonly kind: 'EARNINGS';
  readonly symbol: string;
  readonly eventDate: Date;
  readonly sourceId: string | null;
}

export interface KnownCorporateActionMarketEvent {
  readonly kind: 'CORPORATE_ACTION';
  readonly symbol: string;
  readonly eventDate: Date;
  readonly sourceId: string;
  readonly corporateActionType: CorporateActionType;
}

export type KnownMarketEvent =
  KnownEarningsMarketEvent | KnownCorporateActionMarketEvent;

export interface KnownMarketEventQuery {
  readonly symbol: string;
  readonly asOf?: Date;
  readonly lookaheadDays?: number;
}

export interface KnownMarketEventResult {
  readonly symbol: string;
  readonly asOf: Date;
  readonly lookaheadDays: number;
  readonly events: readonly KnownMarketEvent[];
}
