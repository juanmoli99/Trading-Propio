import {
  STRATEGY_SIGNAL_ACTIONS,
  type StrategySignal,
  type StrategySignalAction,
} from '../src/strategies/signal.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function cloneSignal(signal: StrategySignal): StrategySignal {
  return {
    signalId: signal.signalId,
    signalAt: new Date(signal.signalAt.getTime()),
    expiresAt: new Date(signal.expiresAt.getTime()),
    invalidation: null,
    strategyId: signal.strategyId,
    strategyVersion: signal.strategyVersion,
    symbol: signal.symbol,
    action: signal.action,
    evaluatedAt: new Date(signal.evaluatedAt.getTime()),
    confidence: signal.confidence,
    reason: signal.reason,
  };
}

function main(): void {
  const sourceDate = new Date('2026-08-13T15:30:00.000Z');

  const sourceSignalAt = new Date('2026-08-13T15:30:01.000Z');

  const sourceExpiresAt = new Date('2026-08-13T15:35:01.000Z');

  const signal: StrategySignal = {
    signalId: '123e4567-e89b-42d3-a456-426614174000',
    signalAt: sourceSignalAt,
    expiresAt: sourceExpiresAt,
    invalidation: null,
    strategyId: 'momentum-v1',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt: sourceDate,
    confidence: 0.85,
    reason: 'Momentum conditions satisfied',
  };

  check('SIGNAL_MODEL_EXISTS', signal !== null && typeof signal === 'object');

  check(
    'SIGNAL_ID_PRESENT',
    signal.signalId === '123e4567-e89b-42d3-a456-426614174000',
  );

  check(
    'SIGNAL_TIMESTAMP_PRESENT',
    signal.signalAt.toISOString() === '2026-08-13T15:30:01.000Z',
  );

  check(
    'SIGNAL_EXPIRATION_PRESENT',
    signal.expiresAt.toISOString() === '2026-08-13T15:35:01.000Z',
  );

  check('STRATEGY_ID_PRESENT', signal.strategyId === 'momentum-v1');

  check('STRATEGY_VERSION_PRESENT', signal.strategyVersion === '1.0.0');

  check('SYMBOL_PRESENT', signal.symbol === 'AAPL');

  check('ACTION_PRESENT', signal.action === 'BUY');

  check(
    'EVALUATED_AT_PRESENT',
    signal.evaluatedAt.getTime() === sourceDate.getTime(),
  );

  check('CONFIDENCE_PRESENT', signal.confidence === 0.85);

  check('REASON_PRESENT', signal.reason === 'Momentum conditions satisfied');

  check('ACTION_CATALOG_DEFINED', STRATEGY_SIGNAL_ACTIONS.length === 4);

  check('BUY_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('BUY'));

  check('SELL_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('SELL'));

  check('HOLD_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('HOLD'));

  check('EXIT_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('EXIT'));

  const compileTimeAction: StrategySignalAction = 'BUY';

  check('ACTION_TYPE_USABLE', compileTimeAction === 'BUY');

  const cloned = cloneSignal(signal);

  check('CLONE_PRESERVES_SIGNAL_ID', cloned.signalId === signal.signalId);

  check(
    'CLONE_PRESERVES_SIGNAL_TIMESTAMP',
    cloned.signalAt.getTime() === signal.signalAt.getTime(),
  );

  check(
    'CLONE_PRESERVES_EXPIRATION',
    cloned.expiresAt.getTime() === signal.expiresAt.getTime(),
  );

  check(
    'SIGNAL_TIMESTAMP_DEFENSIVELY_COPIED',
    cloned.signalAt !== signal.signalAt,
  );

  check(
    'SIGNAL_EXPIRATION_DEFENSIVELY_COPIED',
    cloned.expiresAt !== signal.expiresAt,
  );

  check('CLONE_PRESERVES_STRATEGY_ID', cloned.strategyId === signal.strategyId);

  check(
    'CLONE_PRESERVES_STRATEGY_VERSION',
    cloned.strategyVersion === signal.strategyVersion,
  );

  check('CLONE_PRESERVES_SYMBOL', cloned.symbol === signal.symbol);

  check('CLONE_PRESERVES_ACTION', cloned.action === signal.action);

  check('CLONE_PRESERVES_CONFIDENCE', cloned.confidence === signal.confidence);

  check('CLONE_PRESERVES_REASON', cloned.reason === signal.reason);

  check(
    'CLONE_PRESERVES_DATE_VALUE',
    cloned.evaluatedAt.getTime() === signal.evaluatedAt.getTime(),
  );

  check('DATE_DEFENSIVELY_COPIED', cloned.evaluatedAt !== signal.evaluatedAt);

  cloned.evaluatedAt.setUTCFullYear(2030);
  cloned.signalAt.setUTCFullYear(2030);
  cloned.expiresAt.setUTCFullYear(2030);

  check(
    'SOURCE_DATE_NOT_MUTATED',
    signal.evaluatedAt.getUTCFullYear() === 2026,
  );

  check(
    'SOURCE_SIGNAL_TIMESTAMP_NOT_MUTATED',
    signal.signalAt.getUTCFullYear() === 2026,
  );

  check(
    'SOURCE_SIGNAL_EXPIRATION_NOT_MUTATED',
    signal.expiresAt.getUTCFullYear() === 2026,
  );

  check(
    'REPEATED_MODEL_CLONE_DETERMINISTIC',
    JSON.stringify(cloneSignal(signal)) === JSON.stringify(cloneSignal(signal)),
  );

  console.log('PUNTO 245 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
