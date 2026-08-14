import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';
import type {
  StrategyEvaluationContext,
  StrategySignalCandidate,
  TradingStrategy,
} from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown> | unknown,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

async function main(): Promise<void> {
  const validationService = new StrategyValidationService();

  const runner = new StrategyRunnerService(validationService);

  let receivedSymbol: string | null = null;
  let receivedEvaluatedAt: Date | null = null;

  const strategy: TradingStrategy = {
    id: 'test-strategy',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(
      context: StrategyEvaluationContext,
    ): Promise<StrategySignalCandidate> {
      receivedSymbol = context.symbol;
      receivedEvaluatedAt = context.evaluatedAt;

      return {
        strategyId: 'test-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 0.75,
        reason: 'Valid test signal',
      };
    },
  };

  const sourceDate = new Date('2026-08-13T15:00:00.000Z');

  const result = await runner.evaluate(strategy, {
    symbol: ' aapl ',
    evaluatedAt: sourceDate,
  });

  check('STRATEGY_ID_PRESERVED', result.strategyId === 'test-strategy');

  check('SYMBOL_NORMALIZED', result.symbol === 'AAPL');

  check('ACTION_PRESERVED', result.action === 'BUY');

  check('CONFIDENCE_PRESERVED', result.confidence === 0.75);

  check('REASON_PRESERVED', result.reason === 'Valid test signal');

  check(
    'EVALUATED_AT_PRESERVED',
    result.evaluatedAt.toISOString() === '2026-08-13T15:00:00.000Z',
  );

  check('STRATEGY_RECEIVES_NORMALIZED_SYMBOL', receivedSymbol === 'AAPL');

  check(
    'SOURCE_DATE_NOT_MUTATED',
    sourceDate.toISOString() === '2026-08-13T15:00:00.000Z',
  );

  check(
    'CONTEXT_DATE_DEFENSIVELY_COPIED',
    receivedEvaluatedAt !== null && receivedEvaluatedAt !== sourceDate,
  );

  check('RESULT_DATE_DEFENSIVELY_COPIED', result.evaluatedAt !== sourceDate);

  await expectReject('EMPTY_STRATEGY_ID_REJECTED', async () => {
    await runner.evaluate(
      {
        id: '   ',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: '',
            symbol: context.symbol,
            action: 'HOLD',
            evaluatedAt: context.evaluatedAt,
            confidence: 0,
            reason: 'test',
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  await expectReject('INVALID_SYMBOL_REJECTED', async () => {
    await runner.evaluate(strategy, {
      symbol: 'AA PL',
      evaluatedAt: sourceDate,
    });
  });

  await expectReject('INVALID_DATE_REJECTED', async () => {
    await runner.evaluate(strategy, {
      symbol: 'AAPL',
      evaluatedAt: new Date(Number.NaN),
    });
  });

  await expectReject('STRATEGY_ID_MISMATCH_REJECTED', async () => {
    await runner.evaluate(
      {
        id: 'strategy-a',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: 'strategy-b',
            symbol: context.symbol,
            action: 'BUY',
            evaluatedAt: context.evaluatedAt,
            confidence: 0.5,
            reason: 'test',
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  await expectReject('SIGNAL_SYMBOL_MISMATCH_REJECTED', async () => {
    await runner.evaluate(
      {
        id: 'strategy-a',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: 'strategy-a',
            symbol: 'MSFT',
            action: 'BUY',
            evaluatedAt: context.evaluatedAt,
            confidence: 0.5,
            reason: 'test',
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  await expectReject('SIGNAL_DATE_MISMATCH_REJECTED', async () => {
    await runner.evaluate(
      {
        id: 'strategy-a',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: 'strategy-a',
            symbol: context.symbol,
            action: 'BUY',
            evaluatedAt: new Date('2026-08-14T15:00:00.000Z'),
            confidence: 0.5,
            reason: 'test',
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  for (const invalidConfidence of [
    -0.01,
    1.01,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    await expectReject(
      `INVALID_CONFIDENCE_REJECTED_${String(invalidConfidence)}`,
      async () => {
        await runner.evaluate(
          {
            id: 'strategy-a',
            version: '1.0.0',
            parameters: {},
            requiredIndicators: [],
            async evaluate(context) {
              return {
                strategyId: 'strategy-a',
                symbol: context.symbol,
                action: 'HOLD',
                evaluatedAt: context.evaluatedAt,
                confidence: invalidConfidence,
                reason: 'test',
              };
            },
          },
          {
            symbol: 'AAPL',
            evaluatedAt: sourceDate,
          },
        );
      },
    );
  }

  const confidenceZero = await runner.evaluate(
    {
      id: 'zero-confidence',
      version: '1.0.0',
      parameters: {},
      requiredIndicators: [],
      async evaluate(context) {
        return {
          strategyId: 'zero-confidence',
          symbol: context.symbol,
          action: 'HOLD',
          evaluatedAt: context.evaluatedAt,
          confidence: 0,
          reason: 'No confidence',
        };
      },
    },
    {
      symbol: 'AAPL',
      evaluatedAt: sourceDate,
    },
  );

  check('CONFIDENCE_ZERO_SUPPORTED', confidenceZero.confidence === 0);

  const confidenceOne = await runner.evaluate(
    {
      id: 'full-confidence',
      version: '1.0.0',
      parameters: {},
      requiredIndicators: [],
      async evaluate(context) {
        return {
          strategyId: 'full-confidence',
          symbol: context.symbol,
          action: 'SELL',
          evaluatedAt: context.evaluatedAt,
          confidence: 1,
          reason: 'Full confidence',
        };
      },
    },
    {
      symbol: 'AAPL',
      evaluatedAt: sourceDate,
    },
  );

  check('CONFIDENCE_ONE_SUPPORTED', confidenceOne.confidence === 1);

  check('SELL_ACTION_SUPPORTED', confidenceOne.action === 'SELL');

  check('HOLD_ACTION_SUPPORTED', confidenceZero.action === 'HOLD');

  await expectReject('EMPTY_REASON_REJECTED', async () => {
    await runner.evaluate(
      {
        id: 'strategy-a',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: 'strategy-a',
            symbol: context.symbol,
            action: 'BUY',
            evaluatedAt: context.evaluatedAt,
            confidence: 0.5,
            reason: '   ',
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  await expectReject('REASON_TOO_LONG_REJECTED', async () => {
    await runner.evaluate(
      {
        id: 'strategy-a',
        version: '1.0.0',
        parameters: {},
        requiredIndicators: [],
        async evaluate(context) {
          return {
            strategyId: 'strategy-a',
            symbol: context.symbol,
            action: 'BUY',
            evaluatedAt: context.evaluatedAt,
            confidence: 0.5,
            reason: 'A'.repeat(1001),
          };
        },
      },
      {
        symbol: 'AAPL',
        evaluatedAt: sourceDate,
      },
    );
  });

  const first = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: sourceDate,
  });

  const second = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt: sourceDate,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    first.strategyId === second.strategyId &&
      first.symbol === second.symbol &&
      first.action === second.action &&
      first.evaluatedAt.getTime() === second.evaluatedAt.getTime() &&
      first.confidence === second.confidence &&
      first.reason === second.reason,
  );

  console.log('PUNTO 243 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });

