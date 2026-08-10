const sensitiveKeyPattern =
  /api[-_]?key|api[-_]?secret|secret|password|authorization|token|cookie/i;

const secretEnvironmentVariables = [
  'ALPACA_PAPER_API_KEY',
  'ALPACA_PAPER_API_SECRET',
  'ALPACA_LIVE_API_KEY',
  'ALPACA_LIVE_API_SECRET',
] as const;

const redactedValue = '[REDACTED]';

function redactKnownSecretValues(value: string): string {
  return secretEnvironmentVariables.reduce((result, variableName) => {
    const secret = process.env[variableName];

    if (!secret) {
      return result;
    }

    return result.split(secret).join(redactedValue);
  }, value);
}

function redactRecord(
  value: Record<string, unknown>,
  visited: WeakSet<object>,
): Record<string, unknown> {
  if (visited.has(value)) {
    return { circularReference: true };
  }

  visited.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key)
        ? redactedValue
        : redactSecrets(item, visited),
    ]),
  );
}

export function redactSecrets(
  value: unknown,
  visited = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return redactKnownSecretValues(value);
  }

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined' ||
    typeof value === 'bigint'
  ) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactKnownSecretValues(value.message),
      stack: value.stack ? redactKnownSecretValues(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, visited));
  }

  if (typeof value === 'object') {
    return redactRecord(value as Record<string, unknown>, visited);
  }

  return String(value);
}
