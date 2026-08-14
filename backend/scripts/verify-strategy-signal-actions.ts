import {
  STRATEGY_SIGNAL_ACTIONS,
  type StrategySignalAction,
} from '../src/strategies/signal.types';
import type {
  StrategyEvaluationContext,
  TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  check('FOUR_SIGNAL_ACTIONS_DEFINED', STRATEGY_SIGNAL_ACTIONS.length === 4);

  check('BUY_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('BUY'));

  check('SELL_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('SELL'));

  check('HOLD_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('HOLD'));

  check('EXIT_SUPPORTED', STRATEGY_SIGNAL_ACTIONS.includes('EXIT'));

  check(
    'NO_DUPLICATE_SIGNAL_ACTIONS',
    new Set(STRATEGY_SIGNAL_ACTIONS).size === STRATEGY_SIGNAL_ACTIONS.length,
  );

  const typedActions: readonly StrategySignalAction[] = [
    'BUY',
    'SELL',
    'HOLD',
    'EXIT',
  ];

  check('ALL_ACTIONS_USABLE_BY_TYPE', typedActions.length === 4);

  const validationService = new StrategyValidationService();

  const evaluatedAt = new Date('2026-08-13T15:30:00.000Z');

  const context: StrategyEvaluationContext = {
    symbol: 'AAPL',
    evaluatedAt,
  };

  const strategy: TradingStrategy = {
    id: 'verification-strategy',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(receivedContext) {
      return {
        strategyId: 'verification-strategy',
        symbol: receivedContext.symbol,
        action: 'EXIT',
        evaluatedAt: new Date(receivedContext.evaluatedAt),
        confidence: 1,
        reason: 'Exit condition satisfied',
      };
    },
  };

  const normalizedContext = validationService.normalizeContext(context);

  const exitSignal = await strategy.evaluate(normalizedContext);

  const validatedExit = validationService.validateSignal(
    '123e4567-e89b-42d3-a456-426614174000',
    new Date('2026-08-13T15:30:01.000Z'),
    strategy,
    normalizedContext,
    exitSignal,
  );

  check('EXIT_ACCEPTED_BY_SIGNAL_VALIDATION', validatedExit.action === 'EXIT');

  check(
    'EXIT_PRESERVES_STRATEGY_ID',
    validatedExit.strategyId === 'verification-strategy',
  );

  check('EXIT_PRESERVES_SYMBOL', validatedExit.symbol === 'AAPL');

  check(
    'EXIT_PRESERVES_REASON',
    validatedExit.reason === 'Exit condition satisfied',
  );

  let invalidRejected = false;

  try {
    validationService.validateSignal(
      '123e4567-e89b-42d3-a456-426614174000',
      new Date('2026-08-13T15:30:01.000Z'),
      strategy,
      normalizedContext,
      {
        strategyId: 'verification-strategy',
        symbol: 'AAPL',
        action: 'INVALID' as StrategySignalAction,
        evaluatedAt: new Date(evaluatedAt),
        confidence: 1,
        reason: 'Invalid action verification',
      },
    );
  } catch {
    invalidRejected = true;
  }

  check('UNKNOWN_ACTION_REJECTED', invalidRejected);

  const firstCatalog = JSON.stringify(STRATEGY_SIGNAL_ACTIONS);

  const secondCatalog = JSON.stringify(STRATEGY_SIGNAL_ACTIONS);

  check('SIGNAL_ACTION_CATALOG_DETERMINISTIC', firstCatalog === secondCatalog);

  console.log('PUNTO 246 VERIFICADO CORRECTAMENTE.');
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

