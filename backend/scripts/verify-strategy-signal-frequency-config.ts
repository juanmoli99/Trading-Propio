import {
  DEFAULT_MAX_SIGNALS_PER_MINUTE,
  MAX_MAX_SIGNALS_PER_MINUTE,
  MIN_MAX_SIGNALS_PER_MINUTE,
  normalizeStrategyMaxSignalsPerMinute,
  type TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createStrategy(maxSignalsPerMinute?: number): TradingStrategy {
  return {
    id: 'frequency-config-test',
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'frequency-config-test',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.5,
        reason: 'Frequency config verification',
      };
    },
  };
}

function expectReject(
  name: string,
  validation: StrategyValidationService,
  strategy: TradingStrategy,
): void {
  let rejected = false;

  try {
    validation.validateStrategy(strategy);
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  const validation = new StrategyValidationService();

  check(
    'MIN_MAX_SIGNALS_PER_MINUTE_EXPORTED',
    MIN_MAX_SIGNALS_PER_MINUTE === 1,
  );

  check(
    'MAX_MAX_SIGNALS_PER_MINUTE_EXPORTED',
    MAX_MAX_SIGNALS_PER_MINUTE === 60,
  );

  check(
    'DEFAULT_MAX_SIGNALS_PER_MINUTE_EXPORTED',
    DEFAULT_MAX_SIGNALS_PER_MINUTE === 60,
  );

  check(
    'NORMALIZER_EXPORTED',
    normalizeStrategyMaxSignalsPerMinute(undefined) === 60,
  );

  validation.validateStrategy(createStrategy());

  check('STRATEGY_WITH_DEFAULT_FREQUENCY_ACCEPTED', true);

  validation.validateStrategy(createStrategy(1));

  check('STRATEGY_WITH_MIN_FREQUENCY_ACCEPTED', true);

  validation.validateStrategy(createStrategy(60));

  check('STRATEGY_WITH_MAX_FREQUENCY_ACCEPTED', true);

  expectReject(
    'STRATEGY_WITH_ZERO_FREQUENCY_REJECTED',
    validation,
    createStrategy(0),
  );

  expectReject(
    'STRATEGY_WITH_NEGATIVE_FREQUENCY_REJECTED',
    validation,
    createStrategy(-1),
  );

  expectReject(
    'STRATEGY_WITH_EXCESSIVE_FREQUENCY_REJECTED',
    validation,
    createStrategy(61),
  );

  expectReject(
    'STRATEGY_WITH_FRACTIONAL_FREQUENCY_REJECTED',
    validation,
    createStrategy(1.5),
  );

  expectReject(
    'STRATEGY_WITH_NAN_FREQUENCY_REJECTED',
    validation,
    createStrategy(Number.NaN),
  );

  expectReject(
    'STRATEGY_WITH_INFINITY_FREQUENCY_REJECTED',
    validation,
    createStrategy(Number.POSITIVE_INFINITY),
  );

  console.log('PUNTO 259 PASO 2 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
