import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';
import type { TradingStrategy } from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
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
  const validation = new StrategyValidationService();

  const runner = new StrategyRunnerService(validation);

  const strategy: TradingStrategy = {
    id: 'momentum-strategy',
    version: '2.3.1',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'momentum-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 0.91,
        reason: 'Strategy identity verification',
      };
    },
  };

  const result = await runner.evaluate(strategy, {
    symbol: ' aapl ',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  check('SIGNAL_SYMBOL_PRESENT', result.symbol === 'AAPL');

  check(
    'SIGNAL_STRATEGY_ID_PRESENT',
    result.strategyId === 'momentum-strategy',
  );

  check('SIGNAL_STRATEGY_VERSION_PRESENT', result.strategyVersion === '2.3.1');

  check(
    'STRATEGY_VERSION_COPIED_FROM_STRATEGY',
    result.strategyVersion === strategy.version,
  );

  const spacedVersionStrategy: TradingStrategy = {
    id: 'normalized-version',
    version: ' 3.0.0-beta_1 ',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'normalized-version',
        symbol: context.symbol,
        action: 'HOLD',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 0,
        reason: 'Version normalization',
      };
    },
  };

  const normalized = await runner.evaluate(spacedVersionStrategy, {
    symbol: 'MSFT',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  });

  check(
    'STRATEGY_VERSION_NORMALIZED',
    normalized.strategyVersion === '3.0.0-beta_1',
  );

  check('SYMBOL_NORMALIZED_WITH_VERSION', normalized.symbol === 'MSFT');

  for (const invalidVersion of [
    '',
    '   ',
    '1 0',
    '.1.0',
    '-1.0',
    '_1.0',
    'A'.repeat(65),
  ]) {
    await expectReject(
      `INVALID_STRATEGY_VERSION_REJECTED_${JSON.stringify(invalidVersion)}`,
      async () => {
        await runner.evaluate(
          {
            id: 'invalid-version',
            version: invalidVersion,
            parameters: {},
            requiredIndicators: [],
            async evaluate(context) {
              return {
                strategyId: 'invalid-version',
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
            evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
          },
        );
      },
    );
  }

  const versionA: TradingStrategy = {
    id: 'same-strategy',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'same-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.5,
        reason: 'Version A',
      };
    },
  };

  const versionB: TradingStrategy = {
    id: 'same-strategy',
    version: '2.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'same-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.5,
        reason: 'Version B',
      };
    },
  };

  const sharedContext = {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  };

  const signalA = await runner.evaluate(versionA, sharedContext);

  const signalB = await runner.evaluate(versionB, sharedContext);

  check(
    'SAME_STRATEGY_ID_CAN_HAVE_DISTINCT_VERSIONS',
    signalA.strategyId === signalB.strategyId &&
      signalA.strategyVersion === '1.0.0' &&
      signalB.strategyVersion === '2.0.0',
  );

  check(
    'IDENTITY_FIELDS_DO_NOT_CHANGE_SYMBOL',
    signalA.symbol === 'AAPL' && signalB.symbol === 'AAPL',
  );

  console.log('PUNTO 249 VERIFICADO CORRECTAMENTE.');
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

