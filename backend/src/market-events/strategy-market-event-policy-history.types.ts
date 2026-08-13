import type { CorporateActionType } from '../corporate-actions/corporate-actions.types';
import type {
  KnownMarketEvent,
  KnownMarketEventKind,
} from './known-market-event.types';
import type {
  MarketEventPolicyAction,
  StrategyMarketEventPolicyResult,
} from './strategy-market-event-policy.types';

export interface PersistStrategyMarketEventPolicyInput {
  readonly event: KnownMarketEvent;
  readonly result: StrategyMarketEventPolicyResult;
}

export interface StrategyMarketEventPolicyHistoryRecord {
  readonly id: string;

  readonly strategyId: string;
  readonly symbol: string;

  readonly eventKind: KnownMarketEventKind;
  readonly eventDate: Date;
  readonly eventSourceId: string | null;
  readonly corporateActionType: CorporateActionType | null;

  readonly evaluatedAt: Date;

  readonly calendarDaysToEvent: number;

  readonly matchedRuleId: string | null;
  readonly action: MarketEventPolicyAction;

  readonly positionSizeMultiplier: number;

  readonly entryAllowed: boolean;
  readonly overnightAllowed: boolean;

  readonly reason: string;

  readonly createdAt: Date;
}

export interface StrategyMarketEventPolicyHistoryQuery {
  readonly strategyId?: string;
  readonly symbol?: string;
  readonly limit?: number;
}
