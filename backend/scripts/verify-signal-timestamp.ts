import { randomUUID } from 'node:crypto';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';
import type { TradingStrategy } from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const runner = new StrategyRunnerService(validation);

  const strategy: TradingStrategy = {
    id: 'timestamp-test',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'timestamp-test',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 0.9,
        reason: 'Timestamp verification',
      };
    },
  };

  const evaluatedAt = new Date('2026-08-13T15:30:00.000Z');

  const before = Date.now();

  const result = await runner.evaluate(strategy, {
    symbol: 'AAPL',
    evaluatedAt,
  });

  const after = Date.now();

  check('SIGNAL_TIMESTAMP_PRESENT', result.signalAt instanceof Date);

  check('SIGNAL_TIMESTAMP_FINITE', Number.isFinite(result.signalAt.getTime()));

  check(
    'SIGNAL_TIMESTAMP_WITHIN_EXECUTION_WINDOW',
    result.signalAt.getTime() >= before && result.signalAt.getTime() <= after,
  );

  check(
    'SIGNAL_TIMESTAMP_DISTINCT_FROM_EVALUATED_AT',
    result.signalAt.getTime() !== result.evaluatedAt.getTime(),
  );

  check(
    'EVALUATED_AT_STILL_PRESERVED',
    result.evaluatedAt.toISOString() === '2026-08-13T15:30:00.000Z',
  );

  const suppliedTimestamp = new Date('2026-08-13T16:00:00.000Z');

  const normalizedContext = validation.normalizeContext({
    symbol: 'AAPL',
    evaluatedAt,
  });

  const candidate = await strategy.evaluate(normalizedContext);

  const validated = validation.validateSignal(
    randomUUID(),
    suppliedTimestamp,
    strategy,
    normalizedContext,
    candidate,
  );

  check(
    'SUPPLIED_SIGNAL_TIMESTAMP_PRESERVED',
    validated.signalAt.toISOString() === '2026-08-13T16:00:00.000Z',
  );

  check(
    'SIGNAL_TIMESTAMP_DEFENSIVELY_COPIED',
    validated.signalAt !== suppliedTimestamp,
  );

  validated.signalAt.setUTCFullYear(2030);

  check(
    'SOURCE_SIGNAL_TIMESTAMP_NOT_MUTATED',
    suppliedTimestamp.toISOString() === '2026-08-13T16:00:00.000Z',
  );

  for (const invalidTimestamp of [
    new Date(Number.NaN),
    new Date(Number.POSITIVE_INFINITY),
  ]) {
    let rejected = false;

    try {
      validation.validateSignal(
        randomUUID(),
        invalidTimestamp,
        strategy,
        normalizedContext,
        candidate,
      );
    } catch {
      rejected = true;
    }

    check('INVALID_SIGNAL_TIMESTAMP_REJECTED', rejected);
  }

  check(
    'SIGNAL_TIMESTAMP_DOES_NOT_CHANGE_CORE_SIGNAL_DATA',
    result.strategyId === 'timestamp-test' &&
      result.symbol === 'AAPL' &&
      result.action === 'BUY' &&
      result.confidence === 0.9 &&
      result.reason === 'Timestamp verification',
  );

  console.log('PUNTO 248 VERIFICADO CORRECTAMENTE.');
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

