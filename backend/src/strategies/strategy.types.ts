import type { StrategySignalCooldownSeconds } from './signal-cooldown';
import type { StrategyMaxSignalsPerMinute } from './signal-frequency';
import type { StrategySignalInvalidation } from './signal-invalidation';
import type { StrategyMaxSignals } from './signal-total-limit';
import type { StrategySignalValiditySeconds } from './signal-expiration';
import type { StrategyRequiredIndicators } from './strategy-indicators.types';
import type { StrategyParameters } from './strategy-parameters.types';
import type { StrategySignalCandidate } from './signal.types';

export {
  DEFAULT_SIGNAL_COOLDOWN_SECONDS,
  MAX_SIGNAL_COOLDOWN_SECONDS,
  MIN_SIGNAL_COOLDOWN_SECONDS,
  calculateStrategySignalCooldownEndsAt,
  isStrategySignalCooldownActive,
  normalizeStrategySignalCooldownSeconds,
  type StrategySignalCooldownSeconds,
} from './signal-cooldown';

export {
  DEFAULT_MAX_SIGNALS_PER_MINUTE,
  MAX_MAX_SIGNALS_PER_MINUTE,
  MIN_MAX_SIGNALS_PER_MINUTE,
  calculateStrategySignalFrequencyWindowStart,
  isStrategySignalFrequencyLimitReached,
  normalizeStrategyMaxSignalsPerMinute,
  type StrategyMaxSignalsPerMinute,
} from './signal-frequency';

export {
  DEFAULT_MAX_SIGNALS,
  MAX_MAX_SIGNALS,
  MIN_MAX_SIGNALS,
  isStrategySignalTotalLimitReached,
  normalizeStrategyMaxSignals,
  type StrategyMaxSignals,
} from './signal-total-limit';

export {
  DEFAULT_SIGNAL_VALIDITY_SECONDS,
  MAX_SIGNAL_VALIDITY_SECONDS,
  MIN_SIGNAL_VALIDITY_SECONDS,
  calculateStrategySignalExpiration,
  isStrategySignalExpired,
  normalizeStrategySignalValiditySeconds,
  type StrategySignalValiditySeconds,
} from './signal-expiration';

export {
  MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH,
  cloneStrategySignalInvalidation,
  createStrategySignalInvalidation,
  isStrategySignalInvalidated,
  normalizeStrategySignalInvalidationReason,
  normalizeStrategySignalInvalidationTimestamp,
  type StrategySignalInvalidation,
} from './signal-invalidation';

export {
  BUILT_IN_STRATEGY_INDICATORS,
  type BuiltInStrategyIndicatorName,
  type StrategyRequiredIndicators,
} from './strategy-indicators.types';

export {
  type StrategyParameterObject,
  type StrategyParameters,
  type StrategyParameterPrimitive,
  type StrategyParameterValue,
} from './strategy-parameters.types';

export {
  STRATEGY_SIGNAL_ACTIONS,
  type StrategySignal,
  type StrategySignalAction,
  type StrategySignalCandidate,
} from './signal.types';

export interface StrategyEvaluationContext {
  readonly symbol: string;
  readonly evaluatedAt: Date;

  /*
   * El caller externo no controla estos parámetros.
   *
   * StrategyRunnerService siempre resuelve y entrega aquí la configuración
   * efectiva de la estrategia:
   *
   *   strategy.parameters + override específico del símbolo.
   *
   * Se mantiene opcional únicamente por compatibilidad con consumidores
   * históricos que invocan strategy.evaluate() directamente.
   */
  readonly parameters?: StrategyParameters;
}

export interface TradingStrategy {
  readonly id: string;
  readonly version: string;
  readonly signalValiditySeconds?: StrategySignalValiditySeconds;
  readonly signalCooldownSeconds?: StrategySignalCooldownSeconds;
  readonly maxSignalsPerMinute?: StrategyMaxSignalsPerMinute;
  readonly maxSignals?: StrategyMaxSignals;
  readonly parameters: StrategyParameters;
  readonly requiredIndicators: StrategyRequiredIndicators;

  evaluate(
    context: StrategyEvaluationContext,
  ): Promise<StrategySignalCandidate>;
}
