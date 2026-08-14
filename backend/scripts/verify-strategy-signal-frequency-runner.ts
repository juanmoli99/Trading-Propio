import type { PersistentLockService } from '../src/database/locks/persistent-lock.service';
import type { StrategySignalInvalidation } from '../src/strategies/signal-invalidation';
import type { StrategyActivationRepository } from '../src/strategies/strategy-activation.repository';
import { StrategyActivationService } from '../src/strategies/strategy-activation.service';
import type {
  StrategyActivationIdentity,
  StrategyActivationState,
} from '../src/strategies/strategy-activation.types';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type {
  PersistedStrategySignal,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from '../src/strategies/strategy-signal-persistence.types';
import type { StrategySignalRepository } from '../src/strategies/strategy-signal.repository';
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

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
  message: string,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch (error: unknown) {
    rejected = error instanceof Error && error.message.includes(message);
  }

  check(name, rejected);
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
class InMemoryRepository implements StrategySignalRepository {
  readonly records: PersistedStrategySignal[] = [];

  async save(signal: StrategySignal): Promise<PersistedStrategySignal> {
    const duplicate = this.records.find(
      (record) =>
        record.strategyId === signal.strategyId &&
        record.strategyVersion === signal.strategyVersion &&
        record.symbol === signal.symbol &&
        record.action === signal.action &&
        record.evaluatedAt.getTime() === signal.evaluatedAt.getTime(),
    );

    if (duplicate !== undefined) {
      return this.clone(duplicate);
    }

    const persisted: PersistedStrategySignal = {
      ...signal,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      createdAt: new Date(),
    };

    this.records.push(persisted);

    return this.clone(persisted);
  }

  async findBySignalId(
    signalId: string,
  ): Promise<PersistedStrategySignal | null> {
    const result = this.records.find((record) => record.signalId === signalId);

    return result === undefined ? null : this.clone(result);
  }

  async findHistory(
    query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]> {
    return this.records
      .filter(
        (record) =>
          record.strategyId === query.strategyId &&
          (query.strategyVersion === undefined ||
            record.strategyVersion === query.strategyVersion) &&
          (query.symbol === undefined ||
            record.symbol === query.symbol.trim().toUpperCase()) &&
          (query.action === undefined || record.action === query.action) &&
          (query.evaluatedAt === undefined ||
            record.evaluatedAt.getTime() === query.evaluatedAt.getTime()),
      )
      .sort((left, right) => right.signalAt.getTime() - left.signalAt.getTime())
      .slice(0, query.limit ?? 100)
      .map((record) => this.clone(record));
  }

  async countForFrequency(
    lookup: StrategySignalFrequencyLookup,
  ): Promise<number> {
    return this.records.filter(
      (record) =>
        record.strategyId === lookup.strategyId &&
        record.strategyVersion === lookup.strategyVersion &&
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

    return this.records.filter(
      (record) =>
        record.strategyId === strategyId &&
        record.strategyVersion === strategyVersion,
    ).length;
  }
  async invalidate(
    signalId: string,
    _invalidation: StrategySignalInvalidation,
  ): Promise<PersistedStrategySignal> {
    const result = await this.findBySignalId(signalId);

    if (result === null) {
      throw new Error('Strategy signal not found');
    }

    return result;
  }

  private clone(signal: PersistedStrategySignal): PersistedStrategySignal {
    return {
      ...signal,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      createdAt: new Date(signal.createdAt.getTime()),
    };
  }
}

class FakePersistentLock {
  readonly activeKeys = new Set<string>();

  acquireCalls = 0;
  releaseCalls = 0;
  allowAcquire = true;

  async acquire(
    key: string,
    _ownerId: string,
    _ttlMs: number,
  ): Promise<boolean> {
    this.acquireCalls += 1;

    if (!this.allowAcquire || this.activeKeys.has(key)) {
      return false;
    }

    this.activeKeys.add(key);

    return true;
  }

  async release(key: string, _ownerId: string): Promise<boolean> {
    this.releaseCalls += 1;

    return this.activeKeys.delete(key);
  }
}

function createStrategy(
  id: string,
  version: string,
  maxSignalsPerMinute: number,
): TradingStrategy {
  return {
    id,
    version,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: id,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Frequency runner verification',
      };
    },
  };
}

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const activationRepository = new InMemoryActivationRepository();

  const activationService = new StrategyActivationService(activationRepository);

  const repository = new InMemoryRepository();
  const persistence = new StrategySignalPersistenceService(repository);
  const fakeLock = new FakePersistentLock();

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    fakeLock as unknown as PersistentLockService,
    activationService,
  );

  const strategy = createStrategy('frequency-runner', '1.0.0', 2);

  const first = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date(),
  });

  check('FIRST_SIGNAL_ACCEPTED', first.symbol === 'AAPL');

  const second = await runner.evaluate(strategy, {
    symbol: 'MSFT',
    evaluatedAt: new Date(Date.now() + 1),
  });

  check('SECOND_SIGNAL_ACCEPTED', second.symbol === 'MSFT');

  check('TWO_SIGNALS_PERSISTED', repository.records.length === 2);

  await expectReject(
    'THIRD_SIGNAL_REJECTED_BY_FREQUENCY_LIMIT',
    () =>
      runner.evaluate(strategy, {
        symbol: 'NVDA',
        evaluatedAt: new Date(Date.now() + 2),
      }),
    'Strategy signal frequency limit reached',
  );

  check('REJECTED_SIGNAL_NOT_PERSISTED', repository.records.length === 2);

  const duplicate = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date(first.evaluatedAt.getTime()),
  });

  check(
    'DUPLICATE_AT_LIMIT_RETURNS_CANONICAL_SIGNAL',
    duplicate.signalId === first.signalId,
  );

  check(
    'DUPLICATE_AT_LIMIT_DOES_NOT_CREATE_RECORD',
    repository.records.length === 2,
  );

  const differentVersion = createStrategy('frequency-runner', '2.0.0', 1);

  const versionTwoSignal = await runner.evaluate(differentVersion, {
    symbol: 'NVDA',
    evaluatedAt: new Date(Date.now() + 3),
  });

  check(
    'DIFFERENT_VERSION_HAS_INDEPENDENT_LIMIT',
    versionTwoSignal.strategyVersion === '2.0.0',
  );

  fakeLock.allowAcquire = false;

  await expectReject(
    'FREQUENCY_LOCK_CONTENTION_FAILS_CLOSED',
    () =>
      runner.evaluate(strategy, {
        symbol: 'AMD',
        evaluatedAt: new Date(Date.now() + 4),
      }),
    'Strategy signal frequency evaluation is already in progress',
  );

  fakeLock.allowAcquire = true;

  check(
    'ALL_SUCCESSFUL_FREQUENCY_LOCKS_RELEASED',
    fakeLock.activeKeys.size === 0,
  );

  const missingLockRunner = new StrategyRunnerService(
    validation,
    persistence,
    undefined,
    activationService,
  );

  await expectReject(
    'PERSISTED_RUNNER_WITHOUT_FREQUENCY_LOCK_FAILS_CLOSED',
    () =>
      missingLockRunner.evaluate(strategy, {
        symbol: 'META',
        evaluatedAt: new Date(Date.now() + 5),
      }),
    'Persistent lock service is required when strategy signal enforcement is enabled',
  );

  const isolatedRunner = new StrategyRunnerService(validation);

  const isolated = await isolatedRunner.evaluate(strategy, {
    symbol: 'TSLA',
    evaluatedAt: new Date(Date.now() + 6),
  });

  check(
    'RUNNER_WITHOUT_PERSISTENCE_REMAINS_USABLE',
    isolated.symbol === 'TSLA',
  );

  console.log('PUNTO 259 PASO 4 VERIFICADO CORRECTAMENTE.');
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

