import { randomUUID } from 'node:crypto';
import {
  MAX_STRATEGY_SIGNAL_REASON_LENGTH,
  normalizeStrategySignalReason,
} from '../src/strategies/signal-reason';
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
  check(
    'MAX_REASON_LENGTH_DEFINED',
    MAX_STRATEGY_SIGNAL_REASON_LENGTH === 1000,
  );

  const normalized = normalizeStrategySignalReason(
    '  Momentum breakout confirmed  ',
  );

  check('REASON_TRIMMED', normalized === 'Momentum breakout confirmed');

  check(
    'REASON_CONTENT_PRESERVED',
    normalizeStrategySignalReason(
      'RSI oversold and EMA crossover confirmed',
    ) === 'RSI oversold and EMA crossover confirmed',
  );

  const maxLengthReason = 'A'.repeat(MAX_STRATEGY_SIGNAL_REASON_LENGTH);

  check(
    'MAX_LENGTH_REASON_ACCEPTED',
    normalizeStrategySignalReason(maxLengthReason).length ===
      MAX_STRATEGY_SIGNAL_REASON_LENGTH,
  );

  expectReject('EMPTY_REASON_REJECTED', () => {
    normalizeStrategySignalReason('');
  });

  expectReject('WHITESPACE_ONLY_REASON_REJECTED', () => {
    normalizeStrategySignalReason('   ');
  });

  expectReject('TOO_LONG_REASON_REJECTED', () => {
    normalizeStrategySignalReason(
      'A'.repeat(MAX_STRATEGY_SIGNAL_REASON_LENGTH + 1),
    );
  });

  for (const controlCode of [0, 8, 9, 10, 13, 31, 127]) {
    expectReject(`CONTROL_CHARACTER_REJECTED_${controlCode}`, () => {
      normalizeStrategySignalReason(
        `Reason${String.fromCharCode(controlCode)}invalid`,
      );
    });
  }

  expectReject('NON_STRING_REASON_REJECTED', () => {
    normalizeStrategySignalReason(123 as unknown as string);
  });

  const validation = new StrategyValidationService();

  const strategy: TradingStrategy = {
    id: 'reason-strategy',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'reason-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.9,
        reason: '  Breakout above resistance  ',
      };
    },
  };

  validation.validateStrategy(strategy);

  const context = validation.normalizeContext({
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  const candidate = {
    strategyId: 'reason-strategy',
    symbol: 'AAPL',
    action: 'BUY' as const,
    evaluatedAt: new Date(context.evaluatedAt),
    confidence: 0.9,
    reason: '  Breakout above resistance  ',
  };

  const signal = validation.validateSignal(
    randomUUID(),
    new Date('2026-08-13T15:30:01.000Z'),
    strategy,
    context,
    candidate,
  );

  check(
    'VALIDATED_SIGNAL_REASON_NORMALIZED',
    signal.reason === 'Breakout above resistance',
  );

  check('REASON_DOES_NOT_CHANGE_ACTION', signal.action === 'BUY');

  check('REASON_DOES_NOT_CHANGE_CONFIDENCE', signal.confidence === 0.9);

  check(
    'REASON_DOES_NOT_CHANGE_IDENTITY',
    signal.strategyId === 'reason-strategy' &&
      signal.strategyVersion === '1.0.0' &&
      signal.symbol === 'AAPL',
  );

  expectReject('VALIDATION_REJECTS_EMPTY_REASON', () => {
    validation.validateSignal(
      randomUUID(),
      new Date('2026-08-13T15:30:01.000Z'),
      strategy,
      context,
      {
        ...candidate,
        reason: '   ',
      },
    );
  });

  expectReject('VALIDATION_REJECTS_CONTROL_CHARACTER_REASON', () => {
    validation.validateSignal(
      randomUUID(),
      new Date('2026-08-13T15:30:01.000Z'),
      strategy,
      context,
      {
        ...candidate,
        reason: `Breakout${String.fromCharCode(0)}invalid`,
      },
    );
  });

  const first = normalizeStrategySignalReason('  Deterministic reason  ');

  const second = normalizeStrategySignalReason('  Deterministic reason  ');

  check('REASON_NORMALIZATION_DETERMINISTIC', first === second);

  console.log('PUNTO 252 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

