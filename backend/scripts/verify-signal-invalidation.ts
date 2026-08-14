import {
  MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH,
  cloneStrategySignalInvalidation,
  createStrategySignalInvalidation,
  isStrategySignalInvalidated,
  normalizeStrategySignalInvalidationReason,
  normalizeStrategySignalInvalidationTimestamp,
  type StrategySignalInvalidation,
} from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectReject(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  check(
    'MAX_INVALIDATION_REASON_LENGTH_DEFINED',
    MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH === 1000,
  );

  const sourceDate = new Date('2026-08-13T19:00:00.000Z');

  const invalidation = createStrategySignalInvalidation(
    sourceDate,
    '  Market conditions changed  ',
  );

  check('INVALIDATION_CREATED', invalidation !== null);

  check(
    'INVALIDATION_TIMESTAMP_PRESERVED',
    invalidation.invalidatedAt.toISOString() === '2026-08-13T19:00:00.000Z',
  );

  check(
    'INVALIDATION_REASON_NORMALIZED',
    invalidation.reason === 'Market conditions changed',
  );

  check('INVALIDATION_OBJECT_FROZEN', Object.isFrozen(invalidation));

  check(
    'SOURCE_TIMESTAMP_NOT_MUTATED',
    sourceDate.toISOString() === '2026-08-13T19:00:00.000Z',
  );

  check(
    'INVALIDATION_TIMESTAMP_DEFENSIVELY_COPIED',
    invalidation.invalidatedAt !== sourceDate,
  );

  const cloned = cloneStrategySignalInvalidation(invalidation);

  check('CLONE_PRESERVES_REASON', cloned.reason === invalidation.reason);

  check(
    'CLONE_PRESERVES_TIMESTAMP',
    cloned.invalidatedAt.getTime() === invalidation.invalidatedAt.getTime(),
  );

  check(
    'CLONE_TIMESTAMP_DEFENSIVELY_COPIED',
    cloned.invalidatedAt !== invalidation.invalidatedAt,
  );

  check('INVALIDATED_STATE_TRUE', isStrategySignalInvalidated(invalidation));

  check('NON_INVALIDATED_STATE_FALSE', !isStrategySignalInvalidated(null));

  check(
    'REASON_NORMALIZATION_EXPORTED',
    normalizeStrategySignalInvalidationReason('  Explicit invalidation  ') ===
      'Explicit invalidation',
  );

  const normalizedTimestamp =
    normalizeStrategySignalInvalidationTimestamp(sourceDate);

  check(
    'TIMESTAMP_NORMALIZATION_EXPORTED',
    normalizedTimestamp.getTime() === sourceDate.getTime(),
  );

  check(
    'TIMESTAMP_NORMALIZATION_DEFENSIVE',
    normalizedTimestamp !== sourceDate,
  );

  expectReject('EMPTY_INVALIDATION_REASON_REJECTED', () => {
    normalizeStrategySignalInvalidationReason('');
  });

  expectReject('WHITESPACE_INVALIDATION_REASON_REJECTED', () => {
    normalizeStrategySignalInvalidationReason('   ');
  });

  expectReject('OVERSIZED_INVALIDATION_REASON_REJECTED', () => {
    normalizeStrategySignalInvalidationReason(
      'A'.repeat(MAX_STRATEGY_SIGNAL_INVALIDATION_REASON_LENGTH + 1),
    );
  });

  expectReject('CONTROL_CHARACTER_INVALIDATION_REASON_REJECTED', () => {
    normalizeStrategySignalInvalidationReason(
      `Invalid${String.fromCharCode(0)}reason`,
    );
  });

  expectReject('INVALID_INVALIDATION_TIMESTAMP_REJECTED', () => {
    normalizeStrategySignalInvalidationTimestamp(new Date(Number.NaN));
  });

  const typedInvalidation: StrategySignalInvalidation = invalidation;

  check(
    'INVALIDATION_TYPE_EXPORTED',
    typedInvalidation.reason === 'Market conditions changed',
  );

  const first = createStrategySignalInvalidation(
    sourceDate,
    'Deterministic invalidation',
  );

  const second = createStrategySignalInvalidation(
    sourceDate,
    'Deterministic invalidation',
  );

  check(
    'INVALIDATION_CREATION_DETERMINISTIC',
    JSON.stringify(first) === JSON.stringify(second),
  );

  console.log('PUNTO 256 PASO 2 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
