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
  StrategySignalDeduplicationLookup,
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
  expectedMessage: string,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch (error: unknown) {
    rejected =
      error instanceof Error && error.message.includes(expectedMessage);
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

    const key = this.createKey(strategyId, strategyVersion);

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

    const key = this.createKey(strategyId, strategyVersion);

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

  private createKey(strategyId: string, strategyVersion: string): string {
    return `${strategyId}:${strategyVersion}`;
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
      .map((record) => this.clone(record));
  }

  async findByDeduplicationIdentity(
    lookup: StrategySignalDeduplicationLookup,
  ): Promise<PersistedStrategySignal | null> {
    const result = this.records.find(
      (record) =>
        record.strategyId === lookup.strategyId &&
        record.strategyVersion === lookup.strategyVersion &&
        record.symbol === lookup.symbol.trim().toUpperCase() &&
        record.action === lookup.action &&
        record.evaluatedAt.getTime() === lookup.evaluatedAt.getTime(),
    );

    return result === undefined ? null : this.clone(result);
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
    return this.records.filter(
      (record) =>
        record.strategyId === lookup.strategyId &&
        record.strategyVersion === lookup.strategyVersion,
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
  private readonly active = new Map<string, string>();

  allowAcquire = true;

  async acquire(
    key: string,
    ownerId: string,
    _ttlMs: number,
  ): Promise<boolean> {
    if (!this.allowAcquire) {
      return false;
    }

    const current = this.active.get(key);

    if (current !== undefined && current !== ownerId) {
      return false;
    }

    this.active.set(key, ownerId);

    return true;
  }

  async release(key: string, ownerId: string): Promise<boolean> {
    if (this.active.get(key) !== ownerId) {
      return false;
    }

    this.active.delete(key);

    return true;
  }

  hasActiveLocks(): boolean {
    return this.active.size > 0;
  }
}

function createStrategy(version: string, maxSignals: number): TradingStrategy {
  return {
    id: 'total-limit-runner-strategy',
    version,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    maxSignals,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'total-limit-runner-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Total limit runner verification',
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
  const lock = new FakePersistentLock();

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    lock as unknown as PersistentLockService,
    activationService,
  );

  const strategy = createStrategy('1.0.0', 2);

  const first = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T02:00:00.000Z'),
  });

  check('FIRST_SIGNAL_ACCEPTED', first.symbol === 'AAPL');

  const second = await runner.evaluate(strategy, {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-14T02:01:00.000Z'),
  });

  check('SECOND_SIGNAL_ACCEPTED', second.symbol === 'MSFT');

  check('EXACTLY_TWO_SIGNALS_PERSISTED', repository.records.length === 2);

  await expectReject(
    'THIRD_SIGNAL_REJECTED_BY_TOTAL_LIMIT',
    () =>
      runner.evaluate(strategy, {
        symbol: 'NVDA',
        evaluatedAt: new Date('2026-08-14T02:02:00.000Z'),
      }),
    'Strategy total signal limit reached',
  );

  check('REJECTED_SIGNAL_NOT_PERSISTED', repository.records.length === 2);

  const duplicate = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T02:00:00.000Z'),
  });

  check(
    'DUPLICATE_AT_TOTAL_LIMIT_RETURNS_CANONICAL_SIGNAL',
    duplicate.signalId === first.signalId,
  );

  check(
    'DUPLICATE_AT_TOTAL_LIMIT_DOES_NOT_CREATE_RECORD',
    repository.records.length === 2,
  );

  const versionTwo = createStrategy('2.0.0', 1);

  const versionTwoSignal = await runner.evaluate(versionTwo, {
    symbol: 'TSLA',
    evaluatedAt: new Date('2026-08-14T02:03:00.000Z'),
  });

  check(
    'DIFFERENT_VERSION_HAS_INDEPENDENT_TOTAL_LIMIT',
    versionTwoSignal.strategyVersion === '2.0.0',
  );

  check(
    'VERSION_ONE_REMAINS_AT_LIMIT',
    repository.records.filter((record) => record.strategyVersion === '1.0.0')
      .length === 2,
  );

  check(
    'VERSION_TWO_HAS_ONE_SIGNAL',
    repository.records.filter((record) => record.strategyVersion === '2.0.0')
      .length === 1,
  );

  check('ALL_LOCKS_RELEASED', !lock.hasActiveLocks());

  lock.allowAcquire = false;

  await expectReject(
    'LOCK_CONTENTION_FAILS_CLOSED',
    () =>
      runner.evaluate(createStrategy('3.0.0', 2), {
        symbol: 'META',
        evaluatedAt: new Date('2026-08-14T02:04:00.000Z'),
      }),
    'Strategy signal frequency evaluation is already in progress',
  );

  lock.allowAcquire = true;

  check(
    'LOCK_CONTENTION_DOES_NOT_PERSIST_SIGNAL',
    repository.records.every((record) => record.strategyVersion !== '3.0.0'),
  );

  const isolatedRunner = new StrategyRunnerService(validation);

  const isolated = await isolatedRunner.evaluate(createStrategy('4.0.0', 1), {
    symbol: 'AMD',
    evaluatedAt: new Date('2026-08-14T02:05:00.000Z'),
  });

  check('RUNNER_WITHOUT_PERSISTENCE_REMAINS_USABLE', isolated.symbol === 'AMD');

  console.log('PUNTO 260 PASO 4 VERIFICADO CORRECTAMENTE.');
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
