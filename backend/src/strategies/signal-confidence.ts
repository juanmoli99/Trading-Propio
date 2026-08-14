export const MIN_STRATEGY_SIGNAL_CONFIDENCE = 0;
export const MAX_STRATEGY_SIGNAL_CONFIDENCE = 1;

export type StrategySignalConfidence = number;

export function normalizeStrategySignalConfidence(
  value: number,
): StrategySignalConfidence {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Strategy signal confidence must be a finite number');
  }

  if (
    value < MIN_STRATEGY_SIGNAL_CONFIDENCE ||
    value > MAX_STRATEGY_SIGNAL_CONFIDENCE
  ) {
    throw new Error(
      `Strategy signal confidence must be between ${MIN_STRATEGY_SIGNAL_CONFIDENCE} and ${MAX_STRATEGY_SIGNAL_CONFIDENCE}`,
    );
  }

  return value;
}
