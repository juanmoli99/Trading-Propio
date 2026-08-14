export const MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH = 1000;

export interface StrategySignalInvalidation {
  readonly invalidatedAt: Date;
  readonly reason: string;
}

export function normalizeStrategySignalInvalidationReason(
  value: string,
): string {
  if (typeof value !== 'string') {
    throw new Error('Strategy signal invalidation reason must be a string');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error('Strategy signal invalidation reason is required');
  }

  if (normalized.length > MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH) {
    throw new Error(
      `Strategy signal invalidation reason cannot exceed ${MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH} characters`,
    );
  }

  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new Error(
      'Strategy signal invalidation reason cannot contain control characters',
    );
  }

  return normalized;
}

export function normalizeStrategySignalInvalidationTimestamp(
  value: Date,
): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Invalid strategy signal invalidation timestamp');
  }

  return new Date(value.getTime());
}

export function createStrategySignalInvalidation(
  invalidatedAt: Date,
  reason: string,
): StrategySignalInvalidation {
  return Object.freeze({
    invalidatedAt: normalizeStrategySignalInvalidationTimestamp(invalidatedAt),
    reason: normalizeStrategySignalInvalidationReason(reason),
  });
}

export function cloneStrategySignalInvalidation(
  invalidation: StrategySignalInvalidation,
): StrategySignalInvalidation {
  return createStrategySignalInvalidation(
    invalidation.invalidatedAt,
    invalidation.reason,
  );
}

export function isStrategySignalInvalidated(
  invalidation: StrategySignalInvalidation | null,
): boolean {
  return invalidation !== null;
}
