import {
  DEFAULT_MAX_SIGNALS,
  MAX_MAX_SIGNALS,
  MIN_MAX_SIGNALS,
  normalizeStrategyMaxSignals,
  type TradingStrategy,
} from '../src/strategies/strategy.types';
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

function createStrategy(maxSignals?: number): TradingStrategy {
  return {
    id: 'total-limit-config-strategy',
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    maxSignals,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'total-limit-config-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Total limit config verification',
      };
    },
  };
}

function main(): void {
  const validation = new StrategyValidationService();

  check('MIN_MAX_SIGNALS_EXPORTED', MIN_MAX_SIGNALS === 1);

  check('MAX_MAX_SIGNALS_EXPORTED', MAX_MAX_SIGNALS === 1_000_000);

  check('DEFAULT_MAX_SIGNALS_EXPORTED', DEFAULT_MAX_SIGNALS === 1_000_000);

  check(
    'NORMALIZER_EXPORTED',
    normalizeStrategyMaxSignals(undefined) === DEFAULT_MAX_SIGNALS,
  );

  validation.validateStrategy(createStrategy());

  check('STRATEGY_WITH_DEFAULT_TOTAL_LIMIT_ACCEPTED', true);

  validation.validateStrategy(createStrategy(MIN_MAX_SIGNALS));

  check('STRATEGY_WITH_MIN_TOTAL_LIMIT_ACCEPTED', true);

  validation.validateStrategy(createStrategy(MAX_MAX_SIGNALS));

  check('STRATEGY_WITH_MAX_TOTAL_LIMIT_ACCEPTED', true);

  expectReject('STRATEGY_WITH_ZERO_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(0)),
  );

  expectReject('STRATEGY_WITH_NEGATIVE_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(-1)),
  );

  expectReject('STRATEGY_WITH_EXCESSIVE_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(MAX_MAX_SIGNALS + 1)),
  );

  expectReject('STRATEGY_WITH_FRACTIONAL_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(1.5)),
  );

  expectReject('STRATEGY_WITH_NAN_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(Number.NaN)),
  );

  expectReject('STRATEGY_WITH_INFINITY_TOTAL_LIMIT_REJECTED', () =>
    validation.validateStrategy(createStrategy(Number.POSITIVE_INFINITY)),
  );

  console.log('PUNTO 260 PASO 2 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

