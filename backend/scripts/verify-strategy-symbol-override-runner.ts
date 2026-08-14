import type { StrategySymbolOverrideRepository } from '../src/strategies/strategy-symbol-override.repository';
import { StrategySymbolOverrideService } from '../src/strategies/strategy-symbol-override.service';
import type {
  PersistedStrategySymbolOverride,
  StrategySymbolOverride,
  StrategySymbolOverrideIdentity,
} from '../src/strategies/strategy-symbol-override.types';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import type {
  StrategyParameterObject,
  TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

class InMemoryOverrideRepository implements StrategySymbolOverrideRepository {
  private readonly records = new Map<string, PersistedStrategySymbolOverride>();

  async find(
    identity: StrategySymbolOverrideIdentity,
  ): Promise<PersistedStrategySymbolOverride | null> {
    const record = this.records.get(this.key(identity));

    return record === undefined ? null : this.clone(record);
  }

  async upsert(
    override: StrategySymbolOverride,
    expectedVersion?: number,
  ): Promise<PersistedStrategySymbolOverride> {
    const key = this.key(override);

    const current = this.records.get(key);

    if (current === undefined) {
      if (expectedVersion !== undefined) {
        throw new Error('Strategy symbol override not found');
      }

      const now = new Date('2026-08-14T10:00:00.000Z');

      const created: PersistedStrategySymbolOverride = {
        strategyId: override.strategyId,
        strategyVersion: override.strategyVersion,
        symbol: override.symbol,
        parameters: override.parameters,
        version: 0,
        createdAt: now,
        updatedAt: now,
      };

      this.records.set(key, created);

      return this.clone(created);
    }

    if (expectedVersion === undefined || expectedVersion !== current.version) {
      throw new Error('Strategy symbol override version conflict');
    }

    const updated: PersistedStrategySymbolOverride = {
      ...current,
      parameters: override.parameters,
      version: current.version + 1,
      updatedAt: new Date(current.updatedAt.getTime() + 1),
    };

    this.records.set(key, updated);

    return this.clone(updated);
  }

  async delete(
    identity: StrategySymbolOverrideIdentity,
    expectedVersion: number,
  ): Promise<void> {
    const key = this.key(identity);

    const current = this.records.get(key);

    if (current === undefined) {
      throw new Error('Strategy symbol override not found');
    }

    if (current.version !== expectedVersion) {
      throw new Error('Strategy symbol override version conflict');
    }

    this.records.delete(key);
  }

  private key(identity: StrategySymbolOverrideIdentity): string {
    return [
      identity.strategyId,
      identity.strategyVersion,
      identity.symbol,
    ].join(':');
  }

  private clone(
    value: PersistedStrategySymbolOverride,
  ): PersistedStrategySymbolOverride {
    return {
      strategyId: value.strategyId,
      strategyVersion: value.strategyVersion,
      symbol: value.symbol,
      parameters: value.parameters,
      version: value.version,
      createdAt: new Date(value.createdAt.getTime()),
      updatedAt: new Date(value.updatedAt.getTime()),
    };
  }
}

function getObject(value: unknown, field: string): StrategyParameterObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }

  return value as StrategyParameterObject;
}

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const repository = new InMemoryOverrideRepository();

  const overrideService = new StrategySymbolOverrideService(
    validation,
    repository,
  );

  const baseParameters = {
    fastPeriod: 10,
    slowPeriod: 30,
    threshold: 0.5,
    nested: {
      confirmation: 2,
      unchanged: 99,
    },
  };

  const sourceSnapshot = JSON.stringify(baseParameters);

  const receivedParametersCapture: {
    value?: StrategyParameterObject;
  } = {};

  const strategy: TradingStrategy = {
    id: 'override-runner-strategy',
    version: '1.0.0',
    parameters: baseParameters,
    requiredIndicators: [],

    async evaluate(context) {
      if (context.parameters === undefined) {
        throw new Error('Effective strategy parameters are required');
      }

      receivedParametersCapture.value = context.parameters;

      const fast = context.parameters.fastPeriod;

      const slow = context.parameters.slowPeriod;

      const threshold = context.parameters.threshold;

      if (
        typeof fast !== 'number' ||
        typeof slow !== 'number' ||
        typeof threshold !== 'number'
      ) {
        throw new Error('Effective strategy parameters are invalid');
      }

      return {
        strategyId: 'override-runner-strategy',
        symbol: context.symbol,
        action: fast < slow && threshold >= 0.8 ? 'BUY' : 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: threshold,
        reason: `fast=${fast};slow=${slow};threshold=${threshold}`,
      };
    },
  };

  await overrideService.set({
    strategyId: strategy.id,
    strategyVersion: strategy.version,
    symbol: 'AAPL',
    parameters: {
      fastPeriod: 12,
      threshold: 0.8,
      nested: {
        confirmation: 5,
      },
    },
  });

  const runner = new StrategyRunnerService(
    validation,
    undefined,
    undefined,
    undefined,
    overrideService,
  );

  const aapl = await runner.evaluate(strategy, {
    symbol: ' aapl ',
    evaluatedAt: new Date('2026-08-14T10:30:00.000Z'),
  });

  check('AAPL_OVERRIDE_AFFECTS_STRATEGY_RESULT', aapl.action === 'BUY');

  check(
    'AAPL_OVERRIDE_AFFECTS_REASON',
    aapl.reason === 'fast=12;slow=30;threshold=0.8',
  );

  check('AAPL_OVERRIDE_AFFECTS_CONFIDENCE', aapl.confidence === 0.8);

  check(
    'RUNNER_NORMALIZES_SYMBOL_BEFORE_OVERRIDE_LOOKUP',
    aapl.symbol === 'AAPL',
  );

  const receivedParameters = receivedParametersCapture.value;

  check(
    'EFFECTIVE_PARAMETERS_RECEIVED_BY_STRATEGY',
    receivedParameters !== undefined,
  );

  if (receivedParameters === undefined) {
    throw new Error('Strategy did not receive effective parameters');
  }

  check(
    'OVERRIDDEN_PARAMETER_APPLIED',
    receivedParameters.fastPeriod === 12 &&
      receivedParameters.threshold === 0.8,
  );

  check('BASE_PARAMETER_PRESERVED', receivedParameters.slowPeriod === 30);

  const receivedNested = getObject(
    receivedParameters.nested,
    'received nested parameters',
  );

  check('NESTED_OVERRIDE_APPLIED', receivedNested.confirmation === 5);

  check('NESTED_BASE_PARAMETER_PRESERVED', receivedNested.unchanged === 99);

  check('EFFECTIVE_PARAMETERS_FROZEN', Object.isFrozen(receivedParameters));

  check('EFFECTIVE_NESTED_PARAMETERS_FROZEN', Object.isFrozen(receivedNested));

  check(
    'BASE_STRATEGY_PARAMETERS_NOT_MUTATED',
    JSON.stringify(baseParameters) === sourceSnapshot,
  );

  delete receivedParametersCapture.value;

  const msft = await runner.evaluate(strategy, {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-14T10:31:00.000Z'),
  });

  check(
    'SYMBOL_WITHOUT_OVERRIDE_USES_BASE_PARAMETERS',
    msft.action === 'HOLD' && msft.reason === 'fast=10;slow=30;threshold=0.5',
  );

  check('OVERRIDE_ISOLATED_BY_SYMBOL', msft.confidence === 0.5);

  await overrideService.set({
    strategyId: strategy.id,
    strategyVersion: '2.0.0',
    symbol: 'AAPL',
    parameters: {
      threshold: 0.95,
    },
  });

  const versionTwoStrategy: TradingStrategy = {
    ...strategy,
    version: '2.0.0',

    async evaluate(context) {
      if (context.parameters === undefined) {
        throw new Error('Effective strategy parameters are required');
      }

      const threshold = context.parameters.threshold;

      if (typeof threshold !== 'number') {
        throw new Error('Effective threshold is invalid');
      }

      return {
        strategyId: strategy.id,
        symbol: context.symbol,
        action: threshold >= 0.9 ? 'SELL' : 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: threshold,
        reason: `threshold=${threshold}`,
      };
    },
  };

  const versionTwo = await runner.evaluate(versionTwoStrategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T10:32:00.000Z'),
  });

  check(
    'OVERRIDE_ISOLATED_BY_STRATEGY_VERSION',
    versionTwo.action === 'SELL' && versionTwo.confidence === 0.95,
  );

  const versionOneAgain = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T10:33:00.000Z'),
  });

  check(
    'VERSION_ONE_OVERRIDE_REMAINS_UNCHANGED',
    versionOneAgain.confidence === 0.8,
  );

  const callerParameters = {
    fastPeriod: 999,
    slowPeriod: 1,
    threshold: 0,
  };

  const protectedResult = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T10:34:00.000Z'),
    parameters: callerParameters,
  });

  check(
    'CALLER_CANNOT_OVERRIDE_EFFECTIVE_PARAMETERS',
    protectedResult.action === 'BUY' && protectedResult.confidence === 0.8,
  );

  check(
    'CALLER_PARAMETERS_NOT_MUTATED',
    callerParameters.fastPeriod === 999 &&
      callerParameters.slowPeriod === 1 &&
      callerParameters.threshold === 0,
  );

  const runnerWithoutOverrideService = new StrategyRunnerService(validation);

  const baseOnly = await runnerWithoutOverrideService.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-14T10:35:00.000Z'),
  });

  check(
    'RUNNER_WITHOUT_OVERRIDE_SERVICE_USES_BASE_PARAMETERS',
    baseOnly.action === 'HOLD' && baseOnly.confidence === 0.5,
  );

  check('RUNNER_WITHOUT_OVERRIDE_SERVICE_REMAINS_USABLE', true);

  console.log('PUNTO 262 PASO 4 VERIFICADO CORRECTAMENTE.');
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

