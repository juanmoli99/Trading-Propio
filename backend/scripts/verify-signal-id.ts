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

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function main(): Promise<void> {
  const validation = new StrategyValidationService();

  const runner = new StrategyRunnerService(validation);

  const strategy: TradingStrategy = {
    id: 'signal-id-test',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],
    async evaluate(context) {
      return {
        strategyId: 'signal-id-test',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: new Date(context.evaluatedAt),
        confidence: 0.9,
        reason: 'Signal ID verification',
      };
    },
  };

  const context = {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:30:00.000Z'),
  };

  const first = await runner.evaluate(strategy, context);

  const second = await runner.evaluate(strategy, context);

  check(
    'SIGNAL_ID_PRESENT',
    typeof first.signalId === 'string' && first.signalId.length > 0,
  );

  check('SIGNAL_ID_UUID_V4', isUuidV4(first.signalId));

  check('SECOND_SIGNAL_ID_UUID_V4', isUuidV4(second.signalId));

  check('SIGNAL_IDS_UNIQUE_PER_RUN', first.signalId !== second.signalId);

  const suppliedId = randomUUID();

  const normalizedContext = validation.normalizeContext(context);

  const candidate = await strategy.evaluate(normalizedContext);

  const validated = validation.validateSignal(
    suppliedId.toUpperCase(),
    new Date('2026-08-13T15:30:01.000Z'),
    strategy,
    normalizedContext,
    candidate,
  );

  check(
    'VALID_SIGNAL_ID_ACCEPTED',
    validated.signalId === suppliedId.toLowerCase(),
  );

  const invalidIds = [
    '',
    '   ',
    'not-a-uuid',
    '123',
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-42d3-c456-426614174000',
  ];

  for (const invalidId of invalidIds) {
    let rejected = false;

    try {
      validation.validateSignal(
        invalidId,
        new Date('2026-08-13T15:30:01.000Z'),
        strategy,
        normalizedContext,
        candidate,
      );
    } catch {
      rejected = true;
    }

    check(`INVALID_SIGNAL_ID_REJECTED_${JSON.stringify(invalidId)}`, rejected);
  }

  check(
    'SIGNAL_ID_GENERATION_DOES_NOT_CHANGE_CORE_RESULT',
    first.strategyId === second.strategyId &&
      first.symbol === second.symbol &&
      first.action === second.action &&
      first.evaluatedAt.getTime() === second.evaluatedAt.getTime() &&
      first.confidence === second.confidence &&
      first.reason === second.reason,
  );

  console.log('PUNTO 247 VERIFICADO CORRECTAMENTE.');
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

