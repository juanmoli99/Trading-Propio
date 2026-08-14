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
      invalidation: null,
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
  readonly acquiredKeys: string[] = [];
  readonly releasedKeys: string[] = [];

  denyFrequencyLock = false;
  denyCooldownLock = false;

  async acquire(
    key: string,
    _ownerId: string,
    _ttlMs: number,
  ): Promise<boolean> {
    if (
      this.denyFrequencyLock &&
      key.startsWith('strategy-signal-frequency:')
    ) {
      return false;
    }

    if (this.denyCooldownLock && key.startsWith('strategy-signal-cooldown:')) {
      return false;
    }

    if (this.activeKeys.has(key)) {
      return false;
    }

    this.activeKeys.add(key);
    this.acquiredKeys.push(key);

    return true;
  }

  async release(key: string, _ownerId: string): Promise<boolean> {
    if (!this.activeKeys.delete(key)) {
      return false;
    }

    this.releasedKeys.push(key);

    return true;
  }

  countAcquired(prefix: string): number {
    return this.acquiredKeys.filter((key) => key.startsWith(prefix)).length;
  }

  countReleased(prefix: string): number {
    return this.releasedKeys.filter((key) => key.startsWith(prefix)).length;
  }
}

function createStrategy(cooldownSeconds: number): TradingStrategy {
  return {
    id: 'cooldown-runner-strategy',
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: cooldownSeconds,
    maxSignalsPerMinute: 60,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'cooldown-runner-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Cooldown runner verification',
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

  const strategy = createStrategy(300);

  const first = await runner.evaluate(strategy, {
    symbol: ' aapl ',
    evaluatedAt: new Date('2026-08-13T23:30:00.000Z'),
  });

  check('FIRST_SIGNAL_ACCEPTED', first.symbol === 'AAPL');

  check('FIRST_SIGNAL_PERSISTED', repository.records.length === 1);

  check(
    'FREQUENCY_LOCK_ACQUIRED_FOR_FIRST_SIGNAL',
    fakeLock.countAcquired('strategy-signal-frequency:') === 1,
  );

  check(
    'COOLDOWN_LOCK_ACQUIRED_FOR_FIRST_SIGNAL',
    fakeLock.countAcquired('strategy-signal-cooldown:') === 1,
  );

  check(
    'FREQUENCY_LOCK_RELEASED_AFTER_SUCCESS',
    fakeLock.countReleased('strategy-signal-frequency:') === 1,
  );

  check(
    'COOLDOWN_LOCK_RELEASED_AFTER_SUCCESS',
    fakeLock.countReleased('strategy-signal-cooldown:') === 1,
  );

  check('NO_LOCK_REMAINS_AFTER_FIRST_SIGNAL', fakeLock.activeKeys.size === 0);

  const duplicate = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T23:30:00.000Z'),
  });

  check(
    'EXACT_DUPLICATE_RETURNS_CANONICAL_SIGNAL',
    duplicate.signalId === first.signalId,
  );

  check(
    'EXACT_DUPLICATE_DOES_NOT_CREATE_NEW_RECORD',
    repository.records.length === 1,
  );

  check(
    'DUPLICATE_DOES_NOT_REQUIRE_SECOND_COOLDOWN_LOCK',
    fakeLock.countAcquired('strategy-signal-cooldown:') === 1,
  );

  check(
    'DUPLICATE_RELEASES_FREQUENCY_LOCK',
    fakeLock.countReleased('strategy-signal-frequency:') === 2,
  );

  await expectReject(
    'DISTINCT_SIGNAL_BLOCKED_DURING_COOLDOWN',
    () =>
      runner.evaluate(strategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-13T23:31:00.000Z'),
      }),
    'Strategy signal cooldown is active until',
  );

  check('BLOCKED_SIGNAL_NOT_PERSISTED', repository.records.length === 1);

  check(
    'COOLDOWN_LOCK_RELEASED_AFTER_COOLDOWN_REJECTION',
    fakeLock.countReleased('strategy-signal-cooldown:') === 2,
  );

  check(
    'FREQUENCY_LOCK_RELEASED_AFTER_COOLDOWN_REJECTION',
    fakeLock.countReleased('strategy-signal-frequency:') === 3,
  );

  check(
    'NO_LOCK_REMAINS_AFTER_COOLDOWN_REJECTION',
    fakeLock.activeKeys.size === 0,
  );

  fakeLock.denyCooldownLock = true;

  await expectReject(
    'COOLDOWN_LOCK_CONTENTION_REJECTED_CONSERVATIVELY',
    () =>
      runner.evaluate(strategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-13T23:32:00.000Z'),
      }),
    'Strategy signal cooldown evaluation is already in progress',
  );

  fakeLock.denyCooldownLock = false;

  check(
    'FREQUENCY_LOCK_RELEASED_AFTER_COOLDOWN_CONTENTION',
    fakeLock.activeKeys.size === 0,
  );

  const zeroCooldownRepository = new InMemoryRepository();

  const zeroCooldownPersistence = new StrategySignalPersistenceService(
    zeroCooldownRepository,
  );

  const zeroCooldownLock = new FakePersistentLock();

  const zeroCooldownRunner = new StrategyRunnerService(
    validation,
    zeroCooldownPersistence,
    zeroCooldownLock as unknown as PersistentLockService,
    activationService,
  );

  await zeroCooldownRunner.evaluate(createStrategy(0), {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-13T23:40:00.000Z'),
  });

  await zeroCooldownRunner.evaluate(createStrategy(0), {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-13T23:41:00.000Z'),
  });

  check(
    'ZERO_COOLDOWN_ALLOWS_DISTINCT_SIGNALS',
    zeroCooldownRepository.records.length === 2,
  );

  check(
    'ZERO_COOLDOWN_DOES_NOT_ACQUIRE_COOLDOWN_LOCK',
    zeroCooldownLock.countAcquired('strategy-signal-cooldown:') === 0,
  );

  check(
    'ZERO_COOLDOWN_STILL_USES_FREQUENCY_LOCK',
    zeroCooldownLock.countAcquired('strategy-signal-frequency:') === 2,
  );

  check(
    'ZERO_COOLDOWN_FREQUENCY_LOCKS_RELEASED',
    zeroCooldownLock.activeKeys.size === 0,
  );

  const isolatedRunner = new StrategyRunnerService(validation);

  const isolated = await isolatedRunner.evaluate(strategy, {
    symbol: 'NVDA',
    evaluatedAt: new Date('2026-08-13T23:50:00.000Z'),
  });

  check('ISOLATED_RUNNER_REMAINS_USABLE', isolated.symbol === 'NVDA');

  const missingLockRunner = new StrategyRunnerService(
    validation,
    persistence,
    undefined,
    activationService,
  );

  await expectReject(
    'PERSISTED_RUNNER_WITHOUT_LOCK_FAILS_CLOSED',
    () =>
      missingLockRunner.evaluate(strategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-13T23:55:00.000Z'),
      }),
    'Persistent lock service is required',
  );

  const frequencyContentionLock = new FakePersistentLock();

  frequencyContentionLock.denyFrequencyLock = true;

  const frequencyContentionRunner = new StrategyRunnerService(
    validation,
    persistence,
    frequencyContentionLock as unknown as PersistentLockService,
    activationService,
  );

  await expectReject(
    'FREQUENCY_LOCK_CONTENTION_FAILS_CLOSED',
    () =>
      frequencyContentionRunner.evaluate(strategy, {
        symbol: 'META',
        evaluatedAt: new Date('2026-08-13T23:56:00.000Z'),
      }),
    'Strategy signal frequency evaluation is already in progress',
  );

  check(
    'FREQUENCY_CONTENTION_DOES_NOT_LEAVE_LOCK',
    frequencyContentionLock.activeKeys.size === 0,
  );

  console.log('PUNTO 258 REGRESION VERIFICADA CORRECTAMENTE.');
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

