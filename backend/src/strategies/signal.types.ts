import type { StrategySignalInvalidation } from './signal-invalidation';
import type { StrategySignalConfidence } from './signal-confidence';
import type { StrategySignalReason } from './signal-reason';
import type { StrategyParameters } from './strategy-parameters.types';

export {
  MAX_STRATEGY_SIGNAL_CONFIDENCE,
  MIN_STRATEGY_SIGNAL_CONFIDENCE,
  normalizeStrategySignalConfidence,
  type StrategySignalConfidence,
} from './signal-confidence';

export {
  MAX_STRATEGY_SIGNAL_REASON_LENGTH,
  normalizeStrategySignalReason,
  type StrategySignalReason,
} from './signal-reason';

export const STRATEGY_SIGNAL_ACTIONS = [
  'BUY',
  'SELL',
  'HOLD',
  'EXIT',
] as const;

export type StrategySignalAction =
  (typeof STRATEGY_SIGNAL_ACTIONS)[number];

export interface StrategySignalCandidate {
  readonly strategyId: string;
  readonly symbol: string;
  readonly action: StrategySignalAction;
  readonly evaluatedAt: Date;
  readonly confidence: StrategySignalConfidence;
  readonly reason: StrategySignalReason;
}

export interface StrategySignal
  extends StrategySignalCandidate {
  readonly signalId: string;
  readonly signalAt: Date;
  readonly expiresAt: Date;
  readonly strategyVersion: string;

  readonly configurationSnapshot: StrategyParameters;

  readonly invalidation: StrategySignalInvalidation | null;
}
