import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';
import type {
  StrategyParameterObject,
  StrategyParameters,
  TradingStrategy,
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

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const sourceParameters = {
    fastPeriod: 12,
    slowPeriod: 26,
    enabled: true,
    mode: 'trend',
    threshold: 0.75,
    optionalValue: null,
    timeframes: ['1Min', '5Min'],
    filters: {
      minVolume: 1000000,
      requireTrend: true,
    },
  } satisfies StrategyParameters;

  const normalized = validation.normalizeStrategyParameters(sourceParameters);

  check('PARAMETERS_NORMALIZED', normalized !== sourceParameters);

  check('NUMBER_PARAMETER_PRESERVED', normalized.fastPeriod === 12);

  check('BOOLEAN_PARAMETER_PRESERVED', normalized.enabled === true);

  check('STRING_PARAMETER_PRESERVED', normalized.mode === 'trend');

  check('NULL_PARAMETER_PRESERVED', normalized.optionalValue === null);

  check(
    'ARRAY_PARAMETER_PRESERVED',
    Array.isArray(normalized.timeframes) && normalized.timeframes.length === 2,
  );

  const normalizedFilters = normalized.filters;

  const normalizedFiltersObject = normalizedFilters as
    StrategyParameterObject | undefined;

  check(
    'NESTED_OBJECT_PARAMETER_PRESERVED',
    normalizedFiltersObject !== undefined &&
      normalizedFiltersObject !== null &&
      !Array.isArray(normalizedFilters) &&
      normalizedFiltersObject.minVolume === 1000000,
  );

  check('PARAMETERS_TOP_LEVEL_FROZEN', Object.isFrozen(normalized));

  check('PARAMETERS_ARRAY_FROZEN', Object.isFrozen(normalized.timeframes));

  check('PARAMETERS_NESTED_OBJECT_FROZEN', Object.isFrozen(normalized.filters));

  sourceParameters.filters.minVolume = 1;

  const normalizedFiltersAfterMutation = normalized.filters as
    StrategyParameterObject | undefined;

  check(
    'SOURCE_MUTATION_DOES_NOT_AFFECT_NORMALIZED_PARAMETERS',
    normalizedFiltersAfterMutation !== undefined &&
      normalizedFiltersAfterMutation !== null &&
      !Array.isArray(normalized.filters) &&
      normalizedFiltersAfterMutation.minVolume === 1000000,
  );

  const strategyParameters = {
    fastPeriod: 10,
    slowPeriod: 30,
  } satisfies StrategyParameters;

  const strategy: TradingStrategy = {
    id: 'parameter-strategy',
    version: '1.0.0',
    parameters: strategyParameters,
    requiredIndicators: [],
    async evaluate(context) {
      const effectiveParameters = context.parameters ?? strategyParameters;

      const fast = effectiveParameters.fastPeriod;

      const slow = effectiveParameters.slowPeriod;

      if (typeof fast !== 'number' || typeof slow !== 'number') {
        throw new Error('Effective strategy parameters are invalid');
      }

      return {
        strategyId: 'parameter-strategy',
        symbol: context.symbol,
        action: fast < slow ? 'BUY' : 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: `fast=${fast};slow=${slow}`,
      };
    },
  };

  validation.validateStrategy(strategy);

  check('STRATEGY_WITH_PARAMETERS_ACCEPTED', true);

  const runner = new StrategyRunnerService(validation);

  const result = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  check(
    'STRATEGY_CAN_USE_PARAMETERS',
    result.action === 'BUY' && result.reason === 'fast=10;slow=30',
  );

  const emptyStrategy: TradingStrategy = {
    id: 'empty-parameters',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'empty-parameters',
        symbol: context.symbol,
        action: 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: 0,
        reason: 'No parameters',
      };
    },
  };

  validation.validateStrategy(emptyStrategy);

  check('EMPTY_PARAMETERS_SUPPORTED', true);

  for (const invalidNumber of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectReject(
      `NON_FINITE_PARAMETER_REJECTED_${String(invalidNumber)}`,
      () => {
        validation.normalizeStrategyParameters({
          value: invalidNumber,
        });
      },
    );
  }

  expectReject('UNDEFINED_PARAMETER_REJECTED', () => {
    validation.normalizeStrategyParameters({
      value: undefined,
    } as unknown as StrategyParameters);
  });

  expectReject('FUNCTION_PARAMETER_REJECTED', () => {
    validation.normalizeStrategyParameters({
      value: () => true,
    } as unknown as StrategyParameters);
  });

  expectReject('DATE_PARAMETER_REJECTED', () => {
    validation.normalizeStrategyParameters({
      value: new Date(),
    } as unknown as StrategyParameters);
  });

  expectReject('INVALID_PARAMETER_KEY_REJECTED', () => {
    validation.normalizeStrategyParameters({
      'invalid key': 1,
    });
  });

  expectReject('PARAMETER_KEY_STARTING_WITH_NUMBER_REJECTED', () => {
    validation.normalizeStrategyParameters({
      '1period': 10,
    });
  });

  const circular: Record<string, unknown> = {};

  circular.self = circular;

  expectReject('CIRCULAR_PARAMETERS_REJECTED', () => {
    validation.normalizeStrategyParameters(circular as StrategyParameters);
  });

  const tooLongArray = Array.from({ length: 129 }, (_, index) => index);

  expectReject('OVERSIZED_PARAMETER_ARRAY_REJECTED', () => {
    validation.normalizeStrategyParameters({
      values: tooLongArray,
    });
  });

  expectReject('OVERSIZED_PARAMETER_STRING_REJECTED', () => {
    validation.normalizeStrategyParameters({
      value: 'A'.repeat(4097),
    });
  });

  const first = validation.normalizeStrategyParameters({
    period: 20,
    filters: {
      volume: 1000,
    },
  });

  const second = validation.normalizeStrategyParameters({
    period: 20,
    filters: {
      volume: 1000,
    },
  });

  check(
    'PARAMETER_NORMALIZATION_DETERMINISTIC',
    JSON.stringify(first) === JSON.stringify(second),
  );

  console.log('PUNTO 250 VERIFICADO CORRECTAMENTE.');
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

