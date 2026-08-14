export const MIN_SIGNAL_VALIDITY_SECONDS = 1;
export const MAX_SIGNAL_VALIDITY_SECONDS = 86400;
export const DEFAULT_SIGNAL_VALIDITY_SECONDS = 300;

export type StrategySignalValiditySeconds = number;

export function normalizeStrategySignalValiditySeconds(
  value: number | undefined,
): StrategySignalValiditySeconds {
  const resolved = value ?? DEFAULT_SIGNAL_VALIDITY_SECONDS;

  if (
    typeof resolved !== 'number' ||
    !Number.isInteger(resolved) ||
    resolved < MIN_SIGNAL_VALIDITY_SECONDS ||
    resolved > MAX_SIGNAL_VALIDITY_SECONDS
  ) {
    throw new Error(
      `Strategy signal validity seconds must be an integer between ${MIN_SIGNAL_VALIDITY_SECONDS} and ${MAX_SIGNAL_VALIDITY_SECONDS}`,
    );
  }

  return resolved;
}

export function calculateStrategySignalExpiration(
  signalAt: Date,
  validitySeconds: StrategySignalValiditySeconds,
): Date {
  if (!(signalAt instanceof Date) || !Number.isFinite(signalAt.getTime())) {
    throw new Error('Invalid strategy signal timestamp');
  }

  const normalizedValidity =
    normalizeStrategySignalValiditySeconds(validitySeconds);

  const expiresAt = new Date(signalAt.getTime() + normalizedValidity * 1000);

  if (!Number.isFinite(expiresAt.getTime())) {
    throw new Error('Strategy signal expiration calculation is invalid');
  }

  return expiresAt;
}

export function isStrategySignalExpired(
  expiresAt: Date,
  asOf: Date = new Date(),
): boolean {
  if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())) {
    throw new Error('Invalid strategy signal expiration timestamp');
  }

  if (!(asOf instanceof Date) || !Number.isFinite(asOf.getTime())) {
    throw new Error('Invalid strategy signal expiration reference timestamp');
  }

  return asOf.getTime() >= expiresAt.getTime();
}
