import { randomUUID } from 'node:crypto';
import {
  cloneStrategySignalInvalidation,
  type StrategySignalInvalidation,
} from '../src/strategies/signal-invalidation';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type {
  PersistedStrategySignal,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from '../src/strategies/strategy-signal-persistence.types';
import type { StrategySignalRepository } from '../src/strategies/strategy-signal.repository';
import type { StrategySignal } from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

class InMemoryRepository implements StrategySignalRepository {
  private readonly records = new Map<string, PersistedStrategySignal>();

  async save(signal: StrategySignal): Promise<PersistedStrategySignal> {
    if (this.records.has(signal.signalId)) {
      throw new Error('Duplicate signal ID');
    }

    const persisted: PersistedStrategySignal = {
      ...signal,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      invalidation:
        signal.invalidation === null
          ? null
          : cloneStrategySignalInvalidation(signal.invalidation),
      createdAt: new Date('2026-08-13T19:00:00.000Z'),
    };

    this.records.set(signal.signalId, persisted);

    return this.clone(persisted);
  }

  async findBySignalId(
    signalId: string,
  ): Promise<PersistedStrategySignal | null> {
    const record = this.records.get(signalId.trim().toLowerCase());

    return record === undefined ? null : this.clone(record);
  }

  async findHistory(
    _query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]> {
    return Array.from(this.records.values()).map((record) =>
      this.clone(record),
    );
  }

  async countForFrequency(
    lookup: StrategySignalFrequencyLookup,
  ): Promise<number> {
    if (
      !(lookup.windowStart instanceof Date) ||
      !Number.isFinite(lookup.windowStart.getTime())
    ) {
      throw new Error('Invalid strategy signal frequency window start');
    }

    if (
      !(lookup.referenceAt instanceof Date) ||
      !Number.isFinite(lookup.referenceAt.getTime())
    ) {
      throw new Error('Invalid strategy signal frequency reference timestamp');
    }

    if (lookup.windowStart.getTime() >= lookup.referenceAt.getTime()) {
      throw new Error(
        'Strategy signal frequency window start must precede reference timestamp',
      );
    }

    const strategyId = lookup.strategyId.trim();
    const strategyVersion = lookup.strategyVersion.trim();

    if (!strategyId) {
      throw new Error('Invalid strategy ID');
    }

    if (!strategyVersion) {
      throw new Error('Invalid strategy version');
    }

    return Array.from(this.records.values()).filter(
      (record) =>
        record.strategyId === strategyId &&
        record.strategyVersion === strategyVersion &&
        record.signalAt.getTime() >= lookup.windowStart.getTime() &&
        record.signalAt.getTime() <= lookup.referenceAt.getTime(),
    ).length;
  }
  async countForTotalLimit(
    lookup: StrategySignalTotalLimitLookup,
  ): Promise<number> {
    const strategyId = lookup.strategyId.trim();
    const strategyVersion = lookup.strategyVersion.trim();

    if (!strategyId) {
      throw new Error('Invalid strategy ID');
    }

    if (!strategyVersion) {
      throw new Error('Invalid strategy version');
    }

    return Array.from(this.records.values()).filter(
      (record) =>
        record.strategyId === strategyId &&
        record.strategyVersion === strategyVersion,
    ).length;
  }
  async invalidate(
    signalId: string,
    invalidation: StrategySignalInvalidation,
  ): Promise<PersistedStrategySignal> {
    const normalizedSignalId = signalId.trim().toLowerCase();

    const current = this.records.get(normalizedSignalId);

    if (current === undefined) {
      throw new Error('Strategy signal not found');
    }

    if (current.invalidation !== null) {
      return this.clone(current);
    }

    const updated: PersistedStrategySignal = {
      ...current,
      invalidation: cloneStrategySignalInvalidation(invalidation),
    };

    this.records.set(normalizedSignalId, updated);

    return this.clone(updated);
  }

  private clone(signal: PersistedStrategySignal): PersistedStrategySignal {
    return {
      ...signal,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      invalidation:
        signal.invalidation === null
          ? null
          : cloneStrategySignalInvalidation(signal.invalidation),
      createdAt: new Date(signal.createdAt.getTime()),
    };
  }
}

async function main(): Promise<void> {
  const repository = new InMemoryRepository();

  const persistence = new StrategySignalPersistenceService(repository);

  const signalId = randomUUID();

  const signal: StrategySignal = {
    signalId,
    signalAt: new Date('2026-08-13T18:00:00.000Z'),
    expiresAt: new Date('2026-08-13T18:05:00.000Z'),
    strategyId: 'invalidation-persistence-test',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt: new Date('2026-08-13T17:59:59.000Z'),
    confidence: 0.8,
    reason: 'Invalidation persistence verification',
    invalidation: null,
  };

  await persistence.persist(signal);

  const before = await persistence.getBySignalId(signalId);

  check(
    'SIGNAL_INITIAL_NOT_INVALIDATED',
    before !== null && before.invalidation === null,
  );

  const sourceInvalidatedAt = new Date('2026-08-13T18:01:00.000Z');

  const invalidated = await persistence.invalidate(
    signalId.toUpperCase(),
    sourceInvalidatedAt,
    '  Market data became invalid  ',
  );

  check('INVALIDATION_PERSISTED', invalidated.invalidation !== null);

  if (invalidated.invalidation === null) {
    throw new Error('Signal invalidation unexpectedly missing');
  }

  check(
    'INVALIDATION_REASON_NORMALIZED',
    invalidated.invalidation.reason === 'Market data became invalid',
  );

  check(
    'INVALIDATION_TIMESTAMP_PRESERVED',
    invalidated.invalidation.invalidatedAt.getTime() ===
      sourceInvalidatedAt.getTime(),
  );

  check(
    'SOURCE_INVALIDATION_TIMESTAMP_NOT_MUTATED',
    sourceInvalidatedAt.toISOString() === '2026-08-13T18:01:00.000Z',
  );

  check(
    'INVALIDATION_TIMESTAMP_DEFENSIVELY_COPIED',
    invalidated.invalidation.invalidatedAt !== sourceInvalidatedAt,
  );

  const recovered = await persistence.getBySignalId(signalId);

  check(
    'INVALIDATION_RECOVERABLE',
    recovered !== null && recovered.invalidation !== null,
  );

  if (recovered === null || recovered.invalidation === null) {
    throw new Error('Persisted invalidation unexpectedly missing');
  }

  check(
    'RECOVERED_INVALIDATION_REASON_CORRECT',
    recovered.invalidation.reason === 'Market data became invalid',
  );

  check(
    'RECOVERED_INVALIDATION_TIMESTAMP_CORRECT',
    recovered.invalidation.invalidatedAt.toISOString() ===
      '2026-08-13T18:01:00.000Z',
  );

  recovered.invalidation.invalidatedAt.setUTCFullYear(2030);

  const recoveredAgain = await persistence.getBySignalId(signalId);

  check(
    'MUTATING_RETURNED_INVALIDATION_DOES_NOT_MUTATE_STORAGE',
    recoveredAgain !== null &&
      recoveredAgain.invalidation !== null &&
      recoveredAgain.invalidation.invalidatedAt.toISOString() ===
        '2026-08-13T18:01:00.000Z',
  );

  const secondInvalidationAt = new Date('2026-08-13T18:02:00.000Z');

  const secondResult = await persistence.invalidate(
    signalId,
    secondInvalidationAt,
    'Different reason must not overwrite original',
  );

  check(
    'REPEATED_INVALIDATION_IDEMPOTENT',
    secondResult.invalidation !== null &&
      secondResult.invalidation.invalidatedAt.toISOString() ===
        '2026-08-13T18:01:00.000Z' &&
      secondResult.invalidation.reason === 'Market data became invalid',
  );

  check(
    'SECOND_INVALIDATION_DOES_NOT_OVERWRITE_TIMESTAMP',
    secondResult.invalidation !== null &&
      secondResult.invalidation.invalidatedAt.getTime() !==
        secondInvalidationAt.getTime(),
  );

  check(
    'SECOND_INVALIDATION_DOES_NOT_OVERWRITE_REASON',
    secondResult.invalidation !== null &&
      secondResult.invalidation.reason !==
        'Different reason must not overwrite original',
  );

  await expectReject('UNKNOWN_SIGNAL_INVALIDATION_REJECTED', async () => {
    await persistence.invalidate(
      randomUUID(),
      new Date('2026-08-13T18:03:00.000Z'),
      'Unknown signal',
    );
  });

  await expectReject('EMPTY_INVALIDATION_REASON_REJECTED', async () => {
    await persistence.invalidate(
      signalId,
      new Date('2026-08-13T18:03:00.000Z'),
      '   ',
    );
  });

  await expectReject('INVALID_INVALIDATION_TIMESTAMP_REJECTED', async () => {
    await persistence.invalidate(
      signalId,
      new Date(Number.NaN),
      'Invalid timestamp',
    );
  });

  const final = await persistence.getBySignalId(signalId);

  check(
    'ORIGINAL_INVALIDATION_REMAINS_UNCHANGED',
    final !== null &&
      final.invalidation !== null &&
      final.invalidation.invalidatedAt.toISOString() ===
        '2026-08-13T18:01:00.000Z' &&
      final.invalidation.reason === 'Market data became invalid',
  );

  console.log('PUNTO 256 PASO 4 VERIFICADO CORRECTAMENTE.');
}

void main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
