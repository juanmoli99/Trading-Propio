import type { CorporateActionType } from '../corporate-actions/corporate-actions.types';
import type {
  KnownMarketEvent,
  KnownMarketEventKind,
} from './known-market-event.types';

export const MARKET_EVENT_POLICY_ACTIONS = [
  'ALLOW',
  'BLOCK_ENTRY',
  'REDUCE_POSITION_SIZE',
  'PROHIBIT_OVERNIGHT',
] as const;

export type MarketEventPolicyAction =
  (typeof MARKET_EVENT_POLICY_ACTIONS)[number];

export interface StrategyMarketEventPolicyRule {
  readonly id: string;
  readonly eventKind: KnownMarketEventKind;
  readonly action: MarketEventPolicyAction;
  readonly beforeDays: number;
  readonly afterDays: number;
  readonly positionSizeMultiplier?: number;
  readonly corporateActionTypes?: readonly CorporateActionType[];
}

export interface StrategyMarketEventPolicy {
  readonly strategyId: string;
  readonly rules: readonly StrategyMarketEventPolicyRule[];
}

export interface StrategyMarketEventPolicyInput {
  readonly policy: StrategyMarketEventPolicy;
  readonly event: KnownMarketEvent;
  readonly asOf?: Date;
}

export interface StrategyMarketEventPolicyResult {
  readonly strategyId: string;
  readonly symbol: string;
  readonly eventKind: KnownMarketEventKind;
  readonly eventDate: Date;
  readonly asOf: Date;
  readonly calendarDaysToEvent: number;
  readonly matchedRuleId: string | null;
  readonly action: MarketEventPolicyAction;
  readonly positionSizeMultiplier: number;
  readonly entryAllowed: boolean;
  readonly overnightAllowed: boolean;
  readonly reason: string;
}
