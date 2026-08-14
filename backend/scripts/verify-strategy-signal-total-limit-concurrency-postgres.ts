import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PersistentLockService } from '../src/database/locks/persistent-lock.service';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategyActivationRepository } from '../src/strategies/prisma-strategy-activation.repository';
import { PrismaStrategySignalRepository } from '../src/strategies/prisma-strategy-signal.repository';
import { StrategyActivationService } from '../src/strategies/strategy-activation.service';
import { StrategyRunnerService } from '../src/strategies/strategy-runner.service';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type { TradingStrategy } from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createStrategy(
  strategyId: string,
  version: string,
  maxSignals: number,
): TradingStrategy {
  return {
    id: strategyId,
    version,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    maxSignals,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Total limit concurrency PostgreSQL verification',
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
  const strategyId = `total-limit-concurrency-${suffix}`;

  const strategy = createStrategy(strategyId, '1.0.0', 1);

  try {
    const concurrentResults = await Promise.allSettled([
      runner.evaluate(strategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-14T03:00:00.000Z'),
      }),
      runner.evaluate(strategy, {
        symbol: 'MSFT',
        evaluatedAt: new Date('2026-08-14T03:00:01.000Z'),
      }),
    ]);

    const fulfilled = concurrentResults.filter(
      (result) => result.status === 'fulfilled',
    );

    const rejected = concurrentResults.filter(
      (result) => result.status === 'rejected',
    );

    check('EXACTLY_ONE_CONCURRENT_SIGNAL_ACCEPTED', fulfilled.length === 1);

    check('EXACTLY_ONE_CONCURRENT_SIGNAL_REJECTED', rejected.length === 1);

    check(
      'CONCURRENT_REJECTION_IS_CONSERVATIVE',
      rejected.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof Error &&
          (result.reason.message.includes(
            'Strategy signal frequency evaluation is already in progress',
          ) ||
            result.reason.message.includes(
              'Strategy total signal limit reached',
            )),
      ),
    );

    const countAfterConcurrency = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check(
      'EXACTLY_ONE_SIGNAL_PERSISTED_AFTER_CONCURRENCY',
      countAfterConcurrency === 1,
    );

    let nextRejectedByTotalLimit = false;

    try {
      await runner.evaluate(strategy, {
        symbol: 'NVDA',
        evaluatedAt: new Date('2026-08-14T03:01:00.000Z'),
      });
    } catch (error: unknown) {
      nextRejectedByTotalLimit =
        error instanceof Error &&
        error.message.includes('Strategy total signal limit reached');
    }

    check('NEXT_SIGNAL_REJECTED_BY_TOTAL_LIMIT', nextRejectedByTotalLimit);

    const countAfterLimitRejection = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check(
      'TOTAL_LIMIT_REJECTION_DOES_NOT_PERSIST_SIGNAL',
      countAfterLimitRejection === 1,
    );

    const canonical = await prisma.strategySignalRecord.findFirstOrThrow({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    const duplicate = await runner.evaluate(strategy, {
      symbol: canonical.symbol,
      evaluatedAt: new Date(canonical.evaluatedAt.getTime()),
    });

    check(
      'DUPLICATE_AT_TOTAL_LIMIT_RETURNS_CANONICAL_SIGNAL',
      duplicate.signalId === canonical.signalId,
    );

    const countAfterDuplicate = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check(
      'DUPLICATE_AT_TOTAL_LIMIT_DOES_NOT_CREATE_RECORD',
      countAfterDuplicate === 1,
    );

    const versionTwo = createStrategy(strategyId, '2.0.0', 1);

    const versionTwoSignal = await runner.evaluate(versionTwo, {
      symbol: 'TSLA',
      evaluatedAt: new Date('2026-08-14T03:02:00.000Z'),
    });

    check(
      'DIFFERENT_VERSION_HAS_INDEPENDENT_TOTAL_LIMIT',
      versionTwoSignal.strategyVersion === '2.0.0',
    );

    const versionOneCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    const versionTwoCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '2.0.0',
      },
    });

    check(
      'VERSION_TOTAL_LIMITS_ARE_ISOLATED',
      versionOneCount === 1 && versionTwoCount === 1,
    );

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${strategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${strategyId}:`,
            },
          },
        ],
      },
    });

    check('NO_TEST_LOCKS_REMAIN', remainingLocks === 0);

    console.log('PUNTO 260 VERIFICADO CONCURRENTEMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        strategyId,
      },
    });

    await prisma.strategyActivationState.deleteMany({
      where: {
        strategyId,
      },
    });

    await prisma.persistentLock.deleteMany({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${strategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${strategyId}:`,
            },
          },
        ],
      },
    });

    const remainingSignals = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
      },
    });

    const remainingActivationStates =
      await prisma.strategyActivationState.count({
        where: {
          strategyId,
        },
      });

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        OR: [
          {
            key: {
              startsWith: `strategy-signal-frequency:${strategyId}:`,
            },
          },
          {
            key: {
              startsWith: `strategy-signal-cooldown:${strategyId}:`,
            },
          },
        ],
      },
    });

    check('TEST_SIGNAL_RECORDS_CLEANED_UP', remainingSignals === 0);

    check('TEST_ACTIVATION_STATES_CLEANED_UP', remainingActivationStates === 0);

    check('TEST_LOCK_RECORDS_CLEANED_UP', remainingLocks === 0);

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
