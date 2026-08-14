export const MAX_STRATEGY_SIGNAL_REASON_LENGTH = 1000;

export type StrategySignalReason = string;

export function normalizeStrategySignalReason(
  value: string,
): StrategySignalReason {
  if (typeof value !== 'string') {
    throw new Error('Strategy signal reason must be a string');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error('Strategy signal reason is required');
  }

  if (normalized.length > MAX_STRATEGY_SIGNAL_REASON_LENGTH) {
    throw new Error(
      `Strategy signal reason cannot exceed ${MAX_STRATEGY_SIGNAL_REASON_LENGTH} characters`,
    );
  }

  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new Error('Strategy signal reason cannot contain control characters');
  }

  return normalized;
}
