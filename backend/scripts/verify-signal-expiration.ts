import {
  DEFAULT_SIGNAL_VALIDITY_SECONDS,
  MAX_SIGNAL_VALIDITY_SECONDS,
  MIN_SIGNAL_VALIDITY_SECONDS,
  calculateStrategySignalExpiration,
  isStrategySignalExpired,
  normalizeStrategySignalValiditySeconds,
} from '../src/strategies/signal-expiration';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
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

async function main(): Promise<void> {
  check('MIN_VALIDITY_DEFINED', MIN_SIGNAL_VALIDITY_SECONDS === 1);

  check('MAX_VALIDITY_DEFINED', MAX_SIGNAL_VALIDITY_SECONDS === 86400);

  check('DEFAULT_VALIDITY_DEFINED', DEFAULT_SIGNAL_VALIDITY_SECONDS === 300);

  check(
    'DEFAULT_VALIDITY_APPLIED',
    normalizeStrategySignalValiditySeconds(undefined) === 300,
  );

  check(
    'MIN_VALIDITY_ACCEPTED',
    normalizeStrategySignalValiditySeconds(1) === 1,
  );

  check(
    'MAX_VALIDITY_ACCEPTED',
    normalizeStrategySignalValiditySeconds(86400) === 86400,
  );

  for (const invalid of [
    0,
    -1,
    86401,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectReject(`INVALID_VALIDITY_REJECTED_${String(invalid)}`, () => {
      normalizeStrategySignalValiditySeconds(invalid);
    });
  }

  const signalAt = new Date('2026-08-13T15:30:00.000Z');

  const expiresAt = calculateStrategySignalExpiration(signalAt, 60);

  check(
    'EXPIRATION_CALCULATED_CORRECTLY',
    expiresAt.toISOString() === '2026-08-13T15:31:00.000Z',
  );

  check(
    'SOURCE_SIGNAL_AT_NOT_MUTATED',
    signalAt.toISOString() === '2026-08-13T15:30:00.000Z',
  );

  check(
    'NOT_EXPIRED_BEFORE_EXPIRATION',
    !isStrategySignalExpired(expiresAt, new Date('2026-08-13T15:30:59.999Z')),
  );

  check(
    'EXPIRED_EXACTLY_AT_EXPIRATION',
    isStrategySignalExpired(expiresAt, new Date('2026-08-13T15:31:00.000Z')),
  );

  check(
    'EXPIRED_AFTER_EXPIRATION',
    isStrategySignalExpired(expiresAt, new Date('2026-08-13T15:31:00.001Z')),
  );

  const validation = new StrategyValidationService();

  const customStrategy: TradingStrategy = {
    id: 'expiration-test',
    version: '1.0.0',
    signalValiditySeconds: 120,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'expiration-test',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Expiration verification',
      };
    },
  };

  validation.validateStrategy(customStrategy);

  check('CUSTOM_VALIDITY_ACCEPTED', true);

  const context = validation.normalizeContext({
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:00:00.000Z'),
  });

  const candidate = await customStrategy.evaluate(context);

  const controlledSignalAt = new Date('2026-08-13T15:30:00.000Z');

  const validated = validation.validateSignal(
    '123e4567-e89b-42d3-a456-426614174000',
    controlledSignalAt,
    customStrategy,
    context,
    candidate,
  );

  check('VALIDATED_SIGNAL_HAS_EXPIRATION', validated.expiresAt instanceof Date);

  check(
    'CUSTOM_EXPIRATION_APPLIED',
    validated.expiresAt.toISOString() === '2026-08-13T15:32:00.000Z',
  );

  check(
    'EXPIRATION_AFTER_SIGNAL_TIMESTAMP',
    validated.expiresAt.getTime() > validated.signalAt.getTime(),
  );

  check(
    'EXPIRATION_DEFENSIVELY_CREATED',
    validated.expiresAt !== controlledSignalAt,
  );

  const defaultStrategy: TradingStrategy = {
    id: 'default-expiration-test',
    version: '1.0.0',
    parameters: {},
    requiredIndicators: [],

    async evaluate(receivedContext) {
      return {
        strategyId: 'default-expiration-test',
        symbol: receivedContext.symbol,
        action: 'HOLD',
        evaluatedAt: receivedContext.evaluatedAt,
        confidence: 0,
        reason: 'Default expiration verification',
      };
    },
  };

  const defaultCandidate = await defaultStrategy.evaluate(context);

  const defaultSignal = validation.validateSignal(
    '223e4567-e89b-42d3-a456-426614174000',
    controlledSignalAt,
    defaultStrategy,
    context,
    defaultCandidate,
  );

  check(
    'DEFAULT_EXPIRATION_APPLIED_TO_STRATEGY',
    defaultSignal.expiresAt.getTime() - defaultSignal.signalAt.getTime() ===
      300000,
  );

  const runner = new StrategyRunnerService(validation);

  const runnerSignal = await runner.evaluate(customStrategy, {
    symbol: 'AAPL',
    evaluatedAt: new Date('2026-08-13T15:00:00.000Z'),
  });

  check('RUNNER_SIGNAL_HAS_EXPIRATION', runnerSignal.expiresAt instanceof Date);

  check(
    'RUNNER_EXPIRATION_MATCHES_CUSTOM_VALIDITY',
    runnerSignal.expiresAt.getTime() - runnerSignal.signalAt.getTime() ===
      120000,
  );

  expectReject('INVALID_STRATEGY_VALIDITY_REJECTED', () => {
    validation.validateStrategy({
      ...customStrategy,
      signalValiditySeconds: 0,
    });
  });

  expectReject('INVALID_SIGNAL_AT_REJECTED_BY_EXPIRATION', () => {
    calculateStrategySignalExpiration(new Date(Number.NaN), 60);
  });

  expectReject('INVALID_EXPIRATION_REFERENCE_REJECTED', () => {
    isStrategySignalExpired(expiresAt, new Date(Number.NaN));
  });

  const first = calculateStrategySignalExpiration(signalAt, 60);

  const second = calculateStrategySignalExpiration(signalAt, 60);

  check(
    'EXPIRATION_CALCULATION_DETERMINISTIC',
    first.getTime() === second.getTime(),
  );

  console.log('PUNTO 255 NUCLEO VERIFICADO CORRECTAMENTE.');
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
