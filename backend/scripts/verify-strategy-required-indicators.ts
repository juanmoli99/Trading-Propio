import {
  BUILT_IN_STRATEGY_INDICATORS,
  type BuiltInStrategyIndicatorName,
  type TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
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

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  check(
    'BUILT_IN_INDICATOR_CATALOG_DEFINED',
    BUILT_IN_STRATEGY_INDICATORS.length === 13,
  );

  const expectedBuiltIns: readonly BuiltInStrategyIndicatorName[] = [
    'SMA',
    'EMA',
    'RSI',
    'ATR',
    'MACD',
    'BOLLINGER_BANDS',
    'VWAP',
    'ADX',
    'AVERAGE_VOLUME',
    'VOLATILITY',
    'RETURNS',
    'ROLLING_HIGH_LOW',
    'CROSSOVER',
  ];

  check(
    'ALL_BUILT_IN_INDICATORS_DECLARED',
    expectedBuiltIns.every((name) =>
      BUILT_IN_STRATEGY_INDICATORS.includes(name),
    ),
  );

  check(
    'BUILT_IN_INDICATORS_HAVE_NO_DUPLICATES',
    new Set(BUILT_IN_STRATEGY_INDICATORS).size ===
      BUILT_IN_STRATEGY_INDICATORS.length,
  );

  const source = [' sma ', 'rsi', 'MACD', 'custom.indicator-v1'];

  const normalized = validation.normalizeRequiredIndicators(source);

  check('REQUIRED_INDICATORS_NORMALIZED', normalized !== source);

  check(
    'INDICATOR_NAMES_NORMALIZED_TO_UPPERCASE',
    normalized[0] === 'SMA' &&
      normalized[1] === 'RSI' &&
      normalized[2] === 'MACD' &&
      normalized[3] === 'CUSTOM.INDICATOR-V1',
  );

  check(
    'REQUIRED_INDICATOR_ORDER_PRESERVED',
    JSON.stringify(normalized) ===
      JSON.stringify(['SMA', 'RSI', 'MACD', 'CUSTOM.INDICATOR-V1']),
  );

  check('REQUIRED_INDICATORS_FROZEN', Object.isFrozen(normalized));

  source[0] = 'EMA';

  check(
    'SOURCE_MUTATION_DOES_NOT_AFFECT_NORMALIZED_INDICATORS',
    normalized[0] === 'SMA',
  );

  const strategy: TradingStrategy = {
    id: 'indicator-strategy',
    version: '1.0.0',
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
    },
    requiredIndicators: ['EMA', 'RSI', 'CUSTOM-TREND'],

    async evaluate(context) {
      return {
        strategyId: 'indicator-strategy',
        symbol: context.symbol,
        action: 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.5,
        reason: 'Required indicators declared',
      };
    },
  };

  validation.validateStrategy(strategy);

  check('STRATEGY_WITH_REQUIRED_INDICATORS_ACCEPTED', true);

  const runner = new StrategyRunnerService(validation);

  const result = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  check(
    'REQUIRED_INDICATOR_DECLARATION_DOES_NOT_BREAK_EVALUATION',
    result.strategyId === 'indicator-strategy' && result.symbol === 'AAPL',
  );

  const noIndicatorsStrategy: TradingStrategy = {
    id: 'no-indicators',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'no-indicators',
        symbol: context.symbol,
        action: 'HOLD',
        evaluatedAt: context.evaluatedAt,
        confidence: 0,
        reason: 'No indicators required',
      };
    },
  };

  validation.validateStrategy(noIndicatorsStrategy);

  check('EMPTY_REQUIRED_INDICATORS_SUPPORTED', true);

  expectReject('REQUIRED_INDICATORS_MUST_BE_ARRAY', () => {
    validation.normalizeRequiredIndicators(
      'SMA' as unknown as readonly string[],
    );
  });

  for (const invalidName of ['', '   ', 'BAD NAME', '#RSI', 'A'.repeat(101)]) {
    expectReject(
      `INVALID_REQUIRED_INDICATOR_REJECTED_${JSON.stringify(invalidName)}`,
      () => {
        validation.normalizeRequiredIndicators([invalidName]);
      },
    );
  }

  expectReject('NON_STRING_REQUIRED_INDICATOR_REJECTED', () => {
    validation.normalizeRequiredIndicators([
      123,
    ] as unknown as readonly string[]);
  });

  expectReject('DUPLICATE_REQUIRED_INDICATOR_REJECTED', () => {
    validation.normalizeRequiredIndicators(['RSI', ' rsi ']);
  });

  expectReject('TOO_MANY_REQUIRED_INDICATORS_REJECTED', () => {
    validation.normalizeRequiredIndicators(
      Array.from({ length: 65 }, (_, index) => `CUSTOM_${index}`),
    );
  });

  const custom = validation.normalizeRequiredIndicators([
    'my_custom.indicator-v2',
  ]);

  check(
    'CUSTOM_INDICATOR_NAME_SUPPORTED',
    custom[0] === 'MY_CUSTOM.INDICATOR-V2',
  );

  const first = validation.normalizeRequiredIndicators(['SMA', 'RSI', 'ATR']);

  const second = validation.normalizeRequiredIndicators(['SMA', 'RSI', 'ATR']);

  check(
    'REQUIRED_INDICATOR_NORMALIZATION_DETERMINISTIC',
    JSON.stringify(first) === JSON.stringify(second),
  );

  console.log('PUNTO 251 VERIFICADO CORRECTAMENTE.');
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
