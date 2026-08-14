export const MIN_MAX_SIGNALS = 1;
export const MAX_MAX_SIGNALS = 1_000_000;
export const DEFAULT_MAX_SIGNALS = 1_000_000;

export type StrategyMaxSignals = number;

export function normalizeStrategyMaxSignals(
  value: number | undefined,
): StrategyMaxSignals {
  const resolved = value ?? DEFAULT_MAX_SIGNALS;

  if (
    typeof resolved !== 'number' ||
    !Number.isInteger(resolved) ||
    resolved < MIN_MAX_SIGNALS ||
    resolved > MAX_MAX_SIGNALS
  ) {
    throw new Error(
      `Strategy maximum signals must be an integer between ${MIN_MAX_SIGNALS} and ${MAX_MAX_SIGNALS}`,
    );
  }

  return resolved;
}

export function isStrategySignalTotalLimitReached(
  signalCount: number,
  maxSignals: StrategyMaxSignals,
): boolean {
  if (!Number.isInteger(signalCount) || signalCount < 0) {
    throw new Error(
      'Strategy total signal count must be a non-negative integer',
    );
  }

  const normalizedMaximum = normalizeStrategyMaxSignals(maxSignals);

  return signalCount >= normalizedMaximum;
}
