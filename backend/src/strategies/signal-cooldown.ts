export const MIN_SIGNAL_COOLDOWN_SECONDS = 0;
export const MAX_SIGNAL_COOLDOWN_SECONDS = 86400;
export const DEFAULT_SIGNAL_COOLDOWN_SECONDS = 0;

export type StrategySignalCooldownSeconds = number;

export function normalizeStrategySignalCooldownSeconds(
  value: number | undefined,
): StrategySignalCooldownSeconds {
  const resolved = value ?? DEFAULT_SIGNAL_COOLDOWN_SECONDS;

  if (
    typeof resolved !== 'number' ||
    !Number.isInteger(resolved) ||
    resolved < MIN_SIGNAL_COOLDOWN_SECONDS ||
    resolved > MAX_SIGNAL_COOLDOWN_SECONDS
  ) {
    throw new Error(
      `Strategy signal cooldown seconds must be an integer between ${MIN_SIGNAL_COOLDOWN_SECONDS} and ${MAX_SIGNAL_COOLDOWN_SECONDS}`,
    );
  }

  return resolved;
}

export function calculateStrategySignalCooldownEndsAt(
  signalAt: Date,
  cooldownSeconds: StrategySignalCooldownSeconds,
): Date {
  if (!(signalAt instanceof Date) || !Number.isFinite(signalAt.getTime())) {
    throw new Error('Invalid strategy signal cooldown source timestamp');
  }

  const normalizedCooldown =
    normalizeStrategySignalCooldownSeconds(cooldownSeconds);

  const cooldownEndsAt = new Date(
    signalAt.getTime() + normalizedCooldown * 1000,
  );

  if (!Number.isFinite(cooldownEndsAt.getTime())) {
    throw new Error('Strategy signal cooldown calculation is invalid');
  }

  return cooldownEndsAt;
}

export function isStrategySignalCooldownActive(
  previousSignalAt: Date,
  referenceAt: Date,
  cooldownSeconds: StrategySignalCooldownSeconds,
): boolean {
  if (
    !(previousSignalAt instanceof Date) ||
    !Number.isFinite(previousSignalAt.getTime())
  ) {
    throw new Error('Invalid previous strategy signal timestamp');
  }

  if (
    !(referenceAt instanceof Date) ||
    !Number.isFinite(referenceAt.getTime())
  ) {
    throw new Error('Invalid strategy signal cooldown reference timestamp');
  }

  const normalizedCooldown =
    normalizeStrategySignalCooldownSeconds(cooldownSeconds);

  if (normalizedCooldown === 0) {
    return false;
  }

  if (referenceAt.getTime() < previousSignalAt.getTime()) {
    throw new Error(
      'Strategy signal cooldown reference cannot precede previous signal',
    );
  }

  const cooldownEndsAt = calculateStrategySignalCooldownEndsAt(
    previousSignalAt,
    normalizedCooldown,
  );

  return referenceAt.getTime() < cooldownEndsAt.getTime();
}
