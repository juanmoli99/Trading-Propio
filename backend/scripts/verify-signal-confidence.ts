import { randomUUID } from 'node:crypto';
import {
  MAX_STRATEGY_SIGNAL_CONFIDENCE,
  MIN_STRATEGY_SIGNAL_CONFIDENCE,
  normalizeStrategySignalConfidence,
} from '../src/strategies/signal-confidence';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';
import type { TradingStrategy } from '../src/strategies/strategy.types';

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

function main(): void {
  check('MIN_CONFIDENCE_DEFINED', MIN_STRATEGY_SIGNAL_CONFIDENCE === 0);

  check('MAX_CONFIDENCE_DEFINED', MAX_STRATEGY_SIGNAL_CONFIDENCE === 1);

  check('CONFIDENCE_ZERO_ACCEPTED', normalizeStrategySignalConfidence(0) === 0);

  check('CONFIDENCE_ONE_ACCEPTED', normalizeStrategySignalConfidence(1) === 1);

  check(
    'CONFIDENCE_MIDDLE_VALUE_ACCEPTED',
    normalizeStrategySignalConfidence(0.75) === 0.75,
  );

  for (const invalid of [
    -0.0001,
    1.0001,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectReject(`INVALID_CONFIDENCE_REJECTED_${String(invalid)}`, () => {
      normalizeStrategySignalConfidence(invalid);
    });
  }

  expectReject('NON_NUMBER_CONFIDENCE_REJECTED', () => {
    normalizeStrategySignalConfidence('0.5' as unknown as number);
  });

  const validation = new StrategyValidationService();

  const strategy: TradingStrategy = {
    id: 'confidence-strategy',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'confidence-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.825,
        reason: 'Confidence verification',
      };
    },
  };

  validation.validateStrategy(strategy);

  const context = validation.normalizeContext({
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  const validated = validation.validateSignal(
    randomUUID(),
    new Date('2026-08-13T15:30:01.000Z'),
    strategy,
    context,
    {
      strategyId: 'confidence-strategy',
      symbol: 'AAPL',
      action: 'BUY',
      evaluatedAt: new Date(context.evaluatedAt),
      confidence: 0.825,
      reason: 'Confidence verification',
    },
  );

  check(
    'VALIDATED_SIGNAL_CONFIDENCE_PRESERVED',
    validated.confidence === 0.825,
  );

  check('CONFIDENCE_DOES_NOT_CHANGE_ACTION', validated.action === 'BUY');

  check(
    'CONFIDENCE_DOES_NOT_CHANGE_REASON',
    validated.reason === 'Confidence verification',
  );

  check(
    'CONFIDENCE_DOES_NOT_CHANGE_IDENTITY',
    validated.strategyId === 'confidence-strategy' &&
      validated.strategyVersion === '1.0.0' &&
      validated.symbol === 'AAPL',
  );

  expectReject('VALIDATION_REJECTS_CONFIDENCE_BELOW_ZERO', () => {
    validation.validateSignal(
      randomUUID(),
      new Date('2026-08-13T15:30:01.000Z'),
      strategy,
      context,
      {
        strategyId: 'confidence-strategy',
        symbol: 'AAPL',
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: -0.01,
        reason: 'test',
      },
    );
  });

  expectReject('VALIDATION_REJECTS_CONFIDENCE_ABOVE_ONE', () => {
    validation.validateSignal(
      randomUUID(),
      new Date('2026-08-13T15:30:01.000Z'),
      strategy,
      context,
      {
        strategyId: 'confidence-strategy',
        symbol: 'AAPL',
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 1.01,
        reason: 'test',
      },
    );
  });

  const first = normalizeStrategySignalConfidence(0.625);

  const second = normalizeStrategySignalConfidence(0.625);

  check('CONFIDENCE_NORMALIZATION_DETERMINISTIC', first === second);

  check('NO_SEPARATE_SCORE_REQUIRED', !('score' in validated));

  console.log('PUNTO 253 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

