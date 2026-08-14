import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PersistentLockService } from '../src/database/locks/persistent-lock.service';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategyActivationRepository } from '../src/strategies/prisma-strategy-activation.repository';
import { StrategyActivationService } from '../src/strategies/strategy-activation.service';
import { PrismaStrategySignalRepository } from '../src/strategies/prisma-strategy-signal.repository';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type {
  StrategySignal,
  TradingStrategy,
} from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createSignal(
  strategyId: string,
  overrides: Partial<StrategySignal> = {},
): StrategySignal {
  return {
    signalId: randomUUID(),
    signalAt: new Date('2026-08-13T22:30:01.000Z'),
    expiresAt: new Date('2026-08-13T22:35:01.000Z'),
    strategyId,
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt: new Date('2026-08-13T22:30:00.000Z'),
    confidence: 0.8,
    reason: 'Deduplication verification',
    configurationSnapshot: {},
    invalidation: null,
    ...overrides,
  };
}

function createStrategy(strategyId: string): TradingStrategy {
  return {
    id: strategyId,
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Runner deduplication verification',
      };
    },
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL verification');
  }

  const configService = new ConfigService({
    database: {
      url: databaseUrl,
    },
  });

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const repository = new PrismaStrategySignalRepository(prisma);
  const persistence = new StrategySignalPersistenceService(repository);
  const validation = new StrategyValidationService();
  const lockService = new PersistentLockService(prisma);

  const activationRepository = new PrismaStrategyActivationRepository(prisma);

  const activationService = new StrategyActivationService(activationRepository);

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    lockService,
    activationService,
  );

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const directStrategyId = `dedup-direct-${suffix}`;
  const concurrentStrategyId = `dedup-concurrent-${suffix}`;
  const runnerStrategyId = `dedup-runner-${suffix}`;

  try {
    const firstInput = createSignal(directStrategyId);

    const first = await persistence.persist(firstInput);

    check('FIRST_SIGNAL_PERSISTED', first.signalId === firstInput.signalId);

    const duplicateInput = createSignal(directStrategyId, {
      signalId: randomUUID(),
      signalAt: new Date('2026-08-13T22:30:02.000Z'),
      expiresAt: new Date('2026-08-13T22:35:02.000Z'),
      confidence: 0.95,
      reason: 'Duplicate candidate must not replace canonical signal',
    });

    const duplicateResult = await persistence.persist(duplicateInput);

    check(
      'DUPLICATE_RETURNS_CANONICAL_SIGNAL',
      duplicateResult.signalId === first.signalId,
    );

    check(
      'DUPLICATE_DOES_NOT_REPLACE_SIGNAL_AT',
      duplicateResult.signalAt.getTime() === first.signalAt.getTime(),
    );

    check(
      'DUPLICATE_DOES_NOT_REPLACE_CONFIDENCE',
      duplicateResult.confidence === first.confidence,
    );

    check(
      'DUPLICATE_DOES_NOT_REPLACE_REASON',
      duplicateResult.reason === first.reason,
    );

    const directCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId: directStrategyId,
      },
    });

    check('EXACTLY_ONE_DIRECT_RECORD_EXISTS', directCount === 1);

    const differentAction = await persistence.persist(
      createSignal(directStrategyId, {
        signalId: randomUUID(),
        action: 'SELL',
      }),
    );

    check(
      'DIFFERENT_ACTION_IS_DISTINCT_SIGNAL',
      differentAction.signalId !== first.signalId,
    );

    const differentEvaluation = await persistence.persist(
      createSignal(directStrategyId, {
        signalId: randomUUID(),
        evaluatedAt: new Date('2026-08-13T22:31:00.000Z'),
      }),
    );

    check(
      'DIFFERENT_EVALUATION_IS_DISTINCT_SIGNAL',
      differentEvaluation.signalId !== first.signalId,
    );

    const differentVersion = await persistence.persist(
      createSignal(directStrategyId, {
        signalId: randomUUID(),
        strategyVersion: '2.0.0',
      }),
    );

    check(
      'DIFFERENT_VERSION_IS_DISTINCT_SIGNAL',
      differentVersion.signalId !== first.signalId,
    );

    const concurrentInputs = Array.from({ length: 10 }, (_, index) =>
      createSignal(concurrentStrategyId, {
        signalId: randomUUID(),
        signalAt: new Date(
          Date.parse('2026-08-13T22:40:01.000Z') + index * 1000,
        ),
        expiresAt: new Date(
          Date.parse('2026-08-13T22:45:01.000Z') + index * 1000,
        ),
        reason: `Concurrent candidate ${index}`,
      }),
    );

    const concurrentResults = await Promise.all(
      concurrentInputs.map((signal) => persistence.persist(signal)),
    );

    const concurrentSignalIds = new Set(
      concurrentResults.map((signal) => signal.signalId),
    );

    check(
      'CONCURRENT_DUPLICATES_CONVERGE_TO_ONE_SIGNAL_ID',
      concurrentSignalIds.size === 1,
    );

    const concurrentCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId: concurrentStrategyId,
      },
    });

    check(
      'EXACTLY_ONE_CONCURRENT_RECORD_EXISTS_IN_POSTGRESQL',
      concurrentCount === 1,
    );

    const concurrentPhysical =
      await prisma.strategySignalRecord.findFirstOrThrow({
        where: {
          strategyId: concurrentStrategyId,
        },
      });

    check(
      'CONCURRENT_RESULTS_MATCH_STORED_CANONICAL_SIGNAL',
      concurrentResults.every(
        (signal) => signal.signalId === concurrentPhysical.signalId,
      ),
    );

    const runnerStrategy = createStrategy(runnerStrategyId);

    const runnerContext = {
      symbol: ' aapl ',
      evaluatedAt: new Date('2026-08-13T22:50:00.000Z'),
    };

    const runnerSettled = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        runner.evaluate(runnerStrategy, runnerContext),
      ),
    );

    const runnerFulfilled = runnerSettled.filter(
      (result): result is PromiseFulfilledResult<StrategySignal> =>
        result.status === 'fulfilled',
    );

    const runnerRejected = runnerSettled.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    check(
      'RUNNER_CONCURRENT_DUPLICATES_HAVE_ACCEPTED_SIGNAL',
      runnerFulfilled.length >= 1,
    );

    check(
      'RUNNER_CONCURRENT_REJECTIONS_ARE_LOCK_CONTENTION',
      runnerRejected.every(
        (result) =>
          result.reason instanceof Error &&
          result.reason.message.includes(
            'Strategy signal frequency evaluation is already in progress',
          ),
      ),
    );

    const runnerCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId: runnerStrategyId,
      },
    });

    check('RUNNER_PERSISTS_EXACTLY_ONE_SIGNAL', runnerCount === 1);

    const runnerPhysical = await prisma.strategySignalRecord.findFirstOrThrow({
      where: {
        strategyId: runnerStrategyId,
      },
    });

    check(
      'RUNNER_ACCEPTED_RESULTS_USE_CANONICAL_SIGNAL',
      runnerFulfilled.every(
        (result) => result.value.signalId === runnerPhysical.signalId,
      ),
    );

    check(
      'RUNNER_RETURNS_NORMALIZED_SYMBOL',
      runnerFulfilled.every((result) => result.value.symbol === 'AAPL'),
    );

    const replay = await runner.evaluate(runnerStrategy, runnerContext);

    check(
      'RUNNER_DUPLICATE_REPLAY_RETURNS_CANONICAL_SIGNAL',
      replay.signalId === runnerPhysical.signalId,
    );

    const afterReplayCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId: runnerStrategyId,
      },
    });

    check(
      'RUNNER_DUPLICATE_REPLAY_DOES_NOT_CREATE_RECORD',
      afterReplayCount === 1,
    );

    check(
      'DEDUPLICATION_IDENTITY_FIELDS_PRESERVED',
      runnerPhysical.strategyId === runnerStrategyId &&
        runnerPhysical.strategyVersion === '1.0.0' &&
        runnerPhysical.symbol === 'AAPL' &&
        runnerPhysical.action === 'BUY' &&
        runnerPhysical.evaluatedAt.getTime() ===
          runnerContext.evaluatedAt.getTime(),
    );

    const remainingRunnerLocks = await prisma.persistentLock.count({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${runnerStrategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${runnerStrategyId}:`,
            },
          },
        ],
      },
    });

    check('RUNNER_DEDUPLICATION_LOCKS_RELEASED', remainingRunnerLocks === 0);

    console.log('PUNTO 257 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        strategyId: {
          in: [directStrategyId, concurrentStrategyId, runnerStrategyId],
        },
      },
    });

    await prisma.strategyActivationState.deleteMany({
      where: {
        strategyId: {
          in: [directStrategyId, concurrentStrategyId, runnerStrategyId],
        },
      },
    });

    await prisma.persistentLock.deleteMany({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${runnerStrategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${runnerStrategyId}:`,
            },
          },
        ],
      },
    });

    const remaining = await prisma.strategySignalRecord.count({
      where: {
        strategyId: {
          in: [directStrategyId, concurrentStrategyId, runnerStrategyId],
        },
      },
    });

    const remainingActivationStates =
      await prisma.strategyActivationState.count({
        where: {
          strategyId: {
            in: [directStrategyId, concurrentStrategyId, runnerStrategyId],
          },
        },
      });

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${runnerStrategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${runnerStrategyId}:`,
            },
          },
        ],
      },
    });

    check('TEST_RECORDS_CLEANED_UP', remaining === 0);

    check('TEST_ACTIVATION_STATES_CLEANED_UP', remainingActivationStates === 0);

    check('TEST_LOCKS_CLEANED_UP', remainingLocks === 0);

    await prisma.$disconnect();
  }
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



