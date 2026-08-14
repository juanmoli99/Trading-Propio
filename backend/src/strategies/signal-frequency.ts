export const MIN_MAX_SIGNALS_PER_MINUTE = 1;
export const MAX_MAX_SIGNALS_PER_MINUTE = 60;
export const DEFAULT_MAX_SIGNALS_PER_MINUTE = 60;

export type StrategyMaxSignalsPerMinute = number;

export function normalizeStrategyMaxSignalsPerMinute(
  value: number | undefined,
): StrategyMaxSignalsPerMinute {
  const resolved = value ?? DEFAULT_MAX_SIGNALS_PER_MINUTE;

  if (
    typeof resolved !== 'number' ||
    !Number.isInteger(resolved) ||
    resolved < MIN_MAX_SIGNALS_PER_MINUTE ||
    resolved > MAX_MAX_SIGNALS_PER_MINUTE
  ) {
    throw new Error(
      `Strategy maximum signals per minute must be an integer between ${MIN_MAX_SIGNALS_PER_MINUTE} and ${MAX_MAX_SIGNALS_PER_MINUTE}`,
    );
  }

  return resolved;
}

export function calculateStrategySignalFrequencyWindowStart(
  referenceAt: Date,
): Date {
  if (
    !(referenceAt instanceof Date) ||
    !Number.isFinite(referenceAt.getTime())
  ) {
    throw new Error('Invalid strategy signal frequency reference timestamp');
  }

  return new Date(referenceAt.getTime() - 60_000);
}

export function isStrategySignalFrequencyLimitReached(
  signalCount: number,
  maxSignalsPerMinute: StrategyMaxSignalsPerMinute,
): boolean {
  if (!Number.isInteger(signalCount) || signalCount < 0) {
    throw new Error(
      'Strategy signal frequency count must be a non-negative integer',
    );
  }

  const normalizedMaximum =
    normalizeStrategyMaxSignalsPerMinute(maxSignalsPerMinute);

  return signalCount >= normalizedMaximum;
}
