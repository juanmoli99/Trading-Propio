import type { PersistentLockService } from '../src/database/locks/persistent-lock.service';
import type {
  StrategyActivationIdentity,
  StrategyActivationState,
} from '../src/strategies/strategy-activation.types';
import type { StrategyActivationRepository } from '../src/strategies/strategy-activation.repository';
import { StrategyActivationService } from '../src/strategies/strategy-activation.service';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type {
  PersistedStrategySignal,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from '../src/strategies/strategy-signal-persistence.types';
import type { StrategySignalRepository } from '../src/strategies/strategy-signal.repository';
import {
  cloneStrategySignalInvalidation,
  type StrategySignalInvalidation,
} from '../src/strategies/signal-invalidation';
import type {
  StrategySignal,
  TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

class InMemoryActivationRepository implements StrategyActivationRepository {
  private readonly records = new Map<string, StrategyActivationState>();

  async getOrCreate(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState> {
    const strategyId = identity.strategyId.trim();
    const strategyVersion = identity.strategyVersion.trim();
    const key = `${strategyId}:${strategyVersion}`;

    const existing = this.records.get(key);

    if (existing !== undefined) {
      return this.clone(existing);
    }

    const now = new Date();

    const created: StrategyActivationState = {
      strategyId,
      strategyVersion,
      enabled: true,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(key, created);

    return this.clone(created);
  }

  async updateEnabled(
    identity: StrategyActivationIdentity,
    enabled: boolean,
    expectedVersion: number,
  ): Promise<StrategyActivationState> {
    const strategyId = identity.strategyId.trim();
    const strategyVersion = identity.strategyVersion.trim();
    const key = `${strategyId}:${strategyVersion}`;

    const current = this.records.get(key);

    if (current === undefined) {
      throw new Error('Strategy activation state not found');
    }

    if (current.version !== expectedVersion) {
      throw new Error('Strategy activation state version conflict');
    }

    const updated: StrategyActivationState = {
      ...current,
      enabled,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.records.set(key, updated);

    return this.clone(updated);
  }

  private clone(state: StrategyActivationState): StrategyActivationState {
    return {
      ...state,
      createdAt: new Date(state.createdAt.getTime()),
      updatedAt: new Date(state.updatedAt.getTime()),
    };
  }
}
class InMemoryStrategySignalRepository implements StrategySignalRepository {
  readonly records = new Map<string, PersistedStrategySignal>();

  saveCalls = 0;

  shouldFailSave = false;

  async save(signal: StrategySignal): Promise<PersistedStrategySignal> {
    this.saveCalls += 1;

    if (this.shouldFailSave) {
      throw new Error('Simulated persistence failure');
    }

    if (this.records.has(signal.signalId)) {
      throw new Error('Duplicate signal ID');
    }

    const persisted: PersistedStrategySignal = {
      signalId: signal.signalId,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
      symbol: signal.symbol,
      action: signal.action,
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      confidence: signal.confidence,
      reason: signal.reason,
      invalidation:
        signal.invalidation === null
          ? null
          : cloneStrategySignalInvalidation(signal.invalidation),
      createdAt: new Date('2026-08-13T16:00:00.000Z'),
    };

    this.records.set(signal.signalId, persisted);

    return this.clonePersisted(persisted);
  }

  async findBySignalId(
    signalId: string,
  ): Promise<PersistedStrategySignal | null> {
    const result = this.records.get(signalId.toLowerCase());

    return result === undefined ? null : this.clonePersisted(result);
  }

  async findHistory(
    _query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]> {
    return Array.from(this.records.values()).map((record) =>
      this.clonePersisted(record),
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
      return this.clonePersisted(current);
    }

    const updated: PersistedStrategySignal = {
      ...current,
      invalidation: cloneStrategySignalInvalidation(invalidation),
    };

    this.records.set(normalizedSignalId, updated);

    return this.clonePersisted(updated);
  }

  private clonePersisted(
    signal: PersistedStrategySignal,
  ): PersistedStrategySignal {
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

class FakePersistentLock {
  private readonly activeLocks = new Map<string, string>();

  async acquire(
    key: string,
    ownerId: string,
    _ttlMs: number,
  ): Promise<boolean> {
    const currentOwner = this.activeLocks.get(key);

    if (currentOwner !== undefined && currentOwner !== ownerId) {
      return false;
    }

    this.activeLocks.set(key, ownerId);

    return true;
  }

  async release(key: string, ownerId: string): Promise<boolean> {
    const currentOwner = this.activeLocks.get(key);

    if (currentOwner !== ownerId) {
      return false;
    }

    this.activeLocks.delete(key);

    return true;
  }

  hasActiveLocks(): boolean {
    return this.activeLocks.size > 0;
  }
}
function createStrategy(): TradingStrategy {
  return {
    id: 'persistent-strategy',
    version: '1.0.0',
    parameters: {
      period: 20,
    },
    requiredIndicators: ['EMA'],

    async evaluate(context) {
      return {
        strategyId: 'persistent-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Persistence verification',
      };
    },
  };
}

async function main(): Promise<void> {
  const repository = new InMemoryStrategySignalRepository();

  const persistence = new StrategySignalPersistenceService(repository);

  const validation = new StrategyValidationService();

  const activationRepository = new InMemoryActivationRepository();

  const activationService = new StrategyActivationService(activationRepository);

  const lockService = new FakePersistentLock();

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    lockService as unknown as PersistentLockService,
    activationService,
  );

  const evaluatedAt = new Date('2026-08-13T15:30:00.000Z');

  const signal = await runner.evaluate(createStrategy(), {
    symbol: ' aapl ',
    evaluatedAt,
  });

  check(
    'RUNNER_RETURNS_SIGNAL',
    typeof signal.signalId === 'string' && signal.signalId.length > 0,
  );

  check('PERSISTENCE_CALLED_ONCE', repository.saveCalls === 1);

  check(
    'SIGNAL_PERSISTED_BEFORE_SUCCESS',
    repository.records.has(signal.signalId),
  );

  const persisted = repository.records.get(signal.signalId);

  check('PERSISTED_SIGNAL_FOUND', persisted !== undefined);

  if (persisted === undefined) {
    throw new Error('Persisted signal unexpectedly missing');
  }

  check('PERSISTED_SIGNAL_ID_MATCHES', persisted.signalId === signal.signalId);

  check(
    'PERSISTED_STRATEGY_ID_MATCHES',
    persisted.strategyId === 'persistent-strategy',
  );

  check(
    'PERSISTED_STRATEGY_VERSION_MATCHES',
    persisted.strategyVersion === '1.0.0',
  );

  check('PERSISTED_SYMBOL_NORMALIZED', persisted.symbol === 'AAPL');

  check('PERSISTED_ACTION_MATCHES', persisted.action === 'BUY');

  check('PERSISTED_CONFIDENCE_MATCHES', persisted.confidence === 0.8);

  check(
    'PERSISTED_REASON_MATCHES',
    persisted.reason === 'Persistence verification',
  );

  check(
    'PERSISTED_EVALUATED_AT_MATCHES',
    persisted.evaluatedAt.getTime() === evaluatedAt.getTime(),
  );

  check(
    'SOURCE_EVALUATED_AT_NOT_MUTATED',
    evaluatedAt.toISOString() === '2026-08-13T15:30:00.000Z',
  );

  const recovered = await persistence.getBySignalId(signal.signalId);

  check(
    'SIGNAL_RECOVERABLE_BY_ID',
    recovered !== null && recovered.signalId === signal.signalId,
  );

  if (recovered === null) {
    throw new Error('Recovered signal unexpectedly missing');
  }

  check(
    'RECOVERED_DATE_DEFENSIVELY_COPIED',
    recovered.signalAt !== persisted.signalAt &&
      recovered.expiresAt !== persisted.expiresAt &&
      recovered.evaluatedAt !== persisted.evaluatedAt &&
      recovered.createdAt !== persisted.createdAt,
  );
  check('SUCCESSFUL_RUNNER_RELEASES_LOCKS', !lockService.hasActiveLocks());

  const failingRepository = new InMemoryStrategySignalRepository();

  failingRepository.shouldFailSave = true;

  const failingPersistence = new StrategySignalPersistenceService(
    failingRepository,
  );

  const failingLockService = new FakePersistentLock();

  const failingRunner = new StrategyRunnerService(
    validation,
    failingPersistence,
    failingLockService as unknown as PersistentLockService,
    activationService,
  );

  let persistenceFailurePropagated = false;

  try {
    await failingRunner.evaluate(createStrategy(), {
      symbol: 'AAPL',
      evaluatedAt,
    });
  } catch (error: unknown) {
    persistenceFailurePropagated =
      error instanceof Error &&
      error.message === 'Simulated persistence failure';
  }

  check('PERSISTENCE_FAILURE_PROPAGATED', persistenceFailurePropagated);

  check(
    'FAILED_PERSISTENCE_NOT_RECORDED',
    failingRepository.records.size === 0,
  );
  check(
    'FAILED_PERSISTENCE_RELEASES_LOCKS',
    !failingLockService.hasActiveLocks(),
  );

  const runnerWithoutPersistence = new StrategyRunnerService(validation);

  const legacyResult = await runnerWithoutPersistence.evaluate(
    createStrategy(),
    {
      symbol: 'MSFT',
      evaluatedAt,
    },
  );

  check(
    'RUNNER_REMAINS_USABLE_WITHOUT_PERSISTENCE_IN_ISOLATED_TESTS',
    legacyResult.symbol === 'MSFT',
  );

  console.log('PUNTO 254 PASO 3 VERIFICADO CORRECTAMENTE.');
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
