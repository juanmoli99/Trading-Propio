import type { PersistentLockService } from '../src/database/locks/persistent-lock.service';
import type { StrategySignalInvalidation } from '../src/strategies/signal-invalidation';
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
    const key = this.key(identity);
    const existing = this.records.get(key);

    if (existing !== undefined) {
      return this.clone(existing);
    }

    const now = new Date();

    const created: StrategyActivationState = {
      strategyId: identity.strategyId.trim(),
      strategyVersion: identity.strategyVersion.trim(),
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
    const key = this.key(identity);
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

  private key(identity: StrategyActivationIdentity): string {
    return [identity.strategyId.trim(), identity.strategyVersion.trim()].join(
      ':',
    );
  }

  private clone(state: StrategyActivationState): StrategyActivationState {
    return {
      ...state,
      createdAt: new Date(state.createdAt.getTime()),
      updatedAt: new Date(state.updatedAt.getTime()),
    };
  }
}

class InMemorySignalRepository implements StrategySignalRepository {
  readonly records: PersistedStrategySignal[] = [];

  async save(signal: StrategySignal): Promise<PersistedStrategySignal> {
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

  async acquire(
    key: string,
    ownerId: string,
    _ttlMs: number,
  ): Promise<boolean> {
    if (this.active.has(key)) {
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

function createStrategy(
  version: string,
  evaluateCounter: { value: number },
): TradingStrategy {
  return {
    id: 'activation-runner-strategy',
    version,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    maxSignals: 100,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      evaluateCounter.value += 1;

      return {
        strategyId: 'activation-runner-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Activation runner verification',
      };
    },
  };
}

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const activationRepository = new InMemoryActivationRepository();

  const activationService = new StrategyActivationService(activationRepository);

  const signalRepository = new InMemorySignalRepository();

  const persistence = new StrategySignalPersistenceService(signalRepository);

  const lock = new FakePersistentLock();

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    lock as unknown as PersistentLockService,
    activationService,
  );

  const counter = { value: 0 };

  const strategy = createStrategy('1.0.0', counter);

  const initialState = await activationService.getState({
    strategyId: strategy.id,
    strategyVersion: strategy.version,
  });

  check('DEFAULT_ACTIVATION_STATE_ENABLED', initialState.enabled === true);

  const first = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T03:30:00.000Z'),
  });

  check('ENABLED_STRATEGY_ACCEPTED', first.symbol === 'AAPL');

  check('ENABLED_STRATEGY_EXECUTES_EVALUATE', counter.value === 1);

  check(
    'ENABLED_STRATEGY_PERSISTS_SIGNAL',
    signalRepository.records.length === 1,
  );

  await activationService.deactivate({
    strategyId: strategy.id,
    strategyVersion: strategy.version,
  });

  await expectReject(
    'DISABLED_STRATEGY_REJECTED',
    () =>
      runner.evaluate(strategy, {
        symbol: 'MSFT',
        evaluatedAt: new Date('2026-08-14T03:31:00.000Z'),
      }),
    'Strategy is disabled',
  );

  check('DISABLED_STRATEGY_DOES_NOT_EXECUTE_EVALUATE', counter.value === 1);

  check(
    'DISABLED_STRATEGY_DOES_NOT_PERSIST_SIGNAL',
    signalRepository.records.length === 1,
  );

  check(
    'DISABLED_REJECTION_DOES_NOT_ACQUIRE_SIGNAL_LOCK',
    !lock.hasActiveLocks(),
  );

  await activationService.activate({
    strategyId: strategy.id,
    strategyVersion: strategy.version,
  });

  const reactivated = await runner.evaluate(strategy, {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-14T03:32:00.000Z'),
  });

  check('REACTIVATED_STRATEGY_ACCEPTED', reactivated.symbol === 'MSFT');

  check('REACTIVATED_STRATEGY_EXECUTES_EVALUATE', counter.value === 2);

  check(
    'REACTIVATED_STRATEGY_PERSISTS_SIGNAL',
    signalRepository.records.length === 2,
  );

  const versionTwoCounter = { value: 0 };

  const versionTwo = createStrategy('2.0.0', versionTwoCounter);

  const versionTwoResult = await runner.evaluate(versionTwo, {
    symbol: 'NVDA',
    evaluatedAt: new Date('2026-08-14T03:33:00.000Z'),
  });

  check(
    'DIFFERENT_VERSION_DEFAULTS_TO_ENABLED',
    versionTwoResult.strategyVersion === '2.0.0',
  );

  check(
    'DISABLED_VERSION_DOES_NOT_DISABLE_OTHER_VERSION',
    versionTwoCounter.value === 1,
  );

  const missingActivationRunner = new StrategyRunnerService(
    validation,
    persistence,
    lock as unknown as PersistentLockService,
  );

  const missingCounter = { value: 0 };

  await expectReject(
    'PERSISTED_RUNNER_WITHOUT_ACTIVATION_SERVICE_FAILS_CLOSED',
    () =>
      missingActivationRunner.evaluate(
        createStrategy('3.0.0', missingCounter),
        {
          symbol: 'META',
          evaluatedAt: new Date('2026-08-14T03:34:00.000Z'),
        },
      ),
    'Strategy activation service is required',
  );

  check(
    'MISSING_ACTIVATION_SERVICE_DOES_NOT_EXECUTE_STRATEGY',
    missingCounter.value === 0,
  );

  const isolatedCounter = { value: 0 };

  const isolatedRunner = new StrategyRunnerService(validation);

  const isolated = await isolatedRunner.evaluate(
    createStrategy('4.0.0', isolatedCounter),
    {
      symbol: 'AMD',
      evaluatedAt: new Date('2026-08-14T03:35:00.000Z'),
    },
  );

  check(
    'ISOLATED_RUNNER_WITHOUT_PERSISTENCE_REMAINS_USABLE',
    isolated.symbol === 'AMD',
  );

  check('ISOLATED_RUNNER_EXECUTES_STRATEGY', isolatedCounter.value === 1);

  check('ALL_SIGNAL_LOCKS_RELEASED', !lock.hasActiveLocks());

  console.log('PUNTO 261 PASO 3 VERIFICADO CORRECTAMENTE.');
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

