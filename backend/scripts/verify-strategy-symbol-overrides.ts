import type { StrategySymbolOverrideRepository } from '../src/strategies/strategy-symbol-override.repository';
import { StrategySymbolOverrideService } from '../src/strategies/strategy-symbol-override.service';
import type {
  PersistedStrategySymbolOverride,
  StrategySymbolOverride,
  StrategySymbolOverrideIdentity,
} from '../src/strategies/strategy-symbol-override.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

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

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class InMemoryStrategySymbolOverrideRepository implements StrategySymbolOverrideRepository {
  private readonly records = new Map<string, PersistedStrategySymbolOverride>();

  async find(
    identity: StrategySymbolOverrideIdentity,
  ): Promise<PersistedStrategySymbolOverride | null> {
    const record = this.records.get(this.createKey(identity));

    return record === undefined ? null : this.clone(record);
  }

  async upsert(
    override: StrategySymbolOverride,
    expectedVersion?: number,
  ): Promise<PersistedStrategySymbolOverride> {
    const key = this.createKey(override);

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

    if (expectedVersion === undefined) {
      throw new Error(
        'Strategy symbol override already exists; expected version is required',
      );
    }

    if (current.version !== expectedVersion) {
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
    const key = this.createKey(identity);

    const current = this.records.get(key);

    if (current === undefined) {
      throw new Error('Strategy symbol override not found');
    }

    if (current.version !== expectedVersion) {
      throw new Error('Strategy symbol override version conflict');
    }

    this.records.delete(key);
  }

  private createKey(identity: StrategySymbolOverrideIdentity): string {
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

function main(): void {
  const validation = new StrategyValidationService();

  const repository = new InMemoryStrategySymbolOverrideRepository();

  const service = new StrategySymbolOverrideService(validation, repository);

  const identity = service.normalizeIdentity({
    strategyId: '  strategy-a  ',
    strategyVersion: ' 1.0.0 ',
    symbol: ' aapl ',
  });

  check('STRATEGY_ID_NORMALIZED', identity.strategyId === 'strategy-a');

  check('STRATEGY_VERSION_NORMALIZED', identity.strategyVersion === '1.0.0');

  check('SYMBOL_NORMALIZED', identity.symbol === 'AAPL');

  const base = {
    period: 20,
    threshold: 0.5,
    enabled: true,
    labels: ['base'],
    nested: {
      fast: 10,
      slow: 30,
      settings: {
        alpha: 1,
        beta: 2,
      },
    },
  };

  const override = {
    threshold: 0.8,
    labels: ['AAPL'],
    nested: {
      fast: 12,
      settings: {
        beta: 5,
      },
    },
  };

  const resolved = service.resolveParameters(base, override);

  check('BASE_VALUE_PRESERVED_WHEN_NOT_OVERRIDDEN', resolved.period === 20);

  check('PRIMITIVE_OVERRIDE_APPLIED', resolved.threshold === 0.8);

  check('BOOLEAN_BASE_VALUE_PRESERVED', resolved.enabled === true);

  check(
    'ARRAY_OVERRIDE_REPLACES_BASE_ARRAY',
    Array.isArray(resolved.labels) &&
      resolved.labels.length === 1 &&
      resolved.labels[0] === 'AAPL',
  );

  const nestedValue = resolved.nested;

  if (!isPlainRecord(nestedValue)) {
    throw new Error('Resolved nested parameters are invalid');
  }

  const nested = nestedValue;

  check('NESTED_OVERRIDE_APPLIED', nested.fast === 12);

  check('NESTED_BASE_VALUE_PRESERVED', nested.slow === 30);

  const settingsValue = nested.settings;

  if (!isPlainRecord(settingsValue)) {
    throw new Error('Resolved nested settings are invalid');
  }

  const settings = settingsValue;

  check('DEEP_BASE_VALUE_PRESERVED', settings.alpha === 1);

  check('DEEP_OVERRIDE_APPLIED', settings.beta === 5);

  check(
    'BASE_PARAMETERS_NOT_MUTATED',
    base.threshold === 0.5 &&
      base.labels[0] === 'base' &&
      base.nested.fast === 10 &&
      base.nested.settings.beta === 2,
  );

  check(
    'OVERRIDE_PARAMETERS_NOT_MUTATED',
    override.threshold === 0.8 &&
      override.labels[0] === 'AAPL' &&
      override.nested.fast === 12 &&
      override.nested.settings.beta === 5,
  );

  check('RESOLVED_ROOT_IS_FROZEN', Object.isFrozen(resolved));

  check(
    'RESOLVED_ARRAY_IS_FROZEN',
    Array.isArray(resolved.labels) && Object.isFrozen(resolved.labels),
  );

  check('RESOLVED_NESTED_OBJECT_IS_FROZEN', Object.isFrozen(nested));

  check('RESOLVED_DEEP_OBJECT_IS_FROZEN', Object.isFrozen(settings));

  const withoutOverride = service.resolveParameters(base);

  check(
    'MISSING_OVERRIDE_RETURNS_BASE_CONFIGURATION',
    withoutOverride.period === 20 && withoutOverride.threshold === 0.5,
  );

  check(
    'MISSING_OVERRIDE_RESULT_IS_DEFENSIVE',
    withoutOverride !== base && Object.isFrozen(withoutOverride),
  );

  const normalizedOverride = service.normalizeOverride({
    strategyId: ' strategy-a ',
    strategyVersion: '1.0.0',
    symbol: ' msft ',
    parameters: {
      period: 50,
    },
  });

  check(
    'OVERRIDE_IDENTITY_NORMALIZED',
    normalizedOverride.strategyId === 'strategy-a' &&
      normalizedOverride.strategyVersion === '1.0.0' &&
      normalizedOverride.symbol === 'MSFT',
  );

  check(
    'OVERRIDE_PARAMETERS_NORMALIZED',
    normalizedOverride.parameters.period === 50,
  );

  check(
    'NORMALIZED_OVERRIDE_FROZEN',
    Object.isFrozen(normalizedOverride) &&
      Object.isFrozen(normalizedOverride.parameters),
  );

  expectReject('EMPTY_STRATEGY_ID_REJECTED', () => {
    service.normalizeIdentity({
      strategyId: '   ',
      strategyVersion: '1.0.0',
      symbol: 'AAPL',
    });
  });

  expectReject('INVALID_STRATEGY_VERSION_REJECTED', () => {
    service.normalizeIdentity({
      strategyId: 'strategy-a',
      strategyVersion: 'bad version',
      symbol: 'AAPL',
    });
  });

  expectReject('EMPTY_SYMBOL_REJECTED', () => {
    service.normalizeIdentity({
      strategyId: 'strategy-a',
      strategyVersion: '1.0.0',
      symbol: '   ',
    });
  });

  expectReject('SYMBOL_WITH_WHITESPACE_REJECTED', () => {
    service.normalizeIdentity({
      strategyId: 'strategy-a',
      strategyVersion: '1.0.0',
      symbol: 'BRK B',
    });
  });

  expectReject('NON_FINITE_OVERRIDE_PARAMETER_REJECTED', () => {
    service.normalizeOverride({
      strategyId: 'strategy-a',
      strategyVersion: '1.0.0',
      symbol: 'AAPL',
      parameters: {
        period: Number.NaN,
      },
    });
  });

  expectReject('INVALID_OVERRIDE_PARAMETER_KEY_REJECTED', () => {
    service.normalizeOverride({
      strategyId: 'strategy-a',
      strategyVersion: '1.0.0',
      symbol: 'AAPL',
      parameters: {
        'bad key': 1,
      },
    });
  });

  const deterministicA = service.resolveParameters(base, override);

  const deterministicB = service.resolveParameters(base, override);

  check(
    'OVERRIDE_RESOLUTION_DETERMINISTIC',
    JSON.stringify(deterministicA) === JSON.stringify(deterministicB),
  );

  console.log('PUNTO 262 PASO 1 VERIFICADO CORRECTAMENTE.');
}

try {
  main();

  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);

  console.log('EXIT_CODE: 1');

  process.exitCode = 1;
}

