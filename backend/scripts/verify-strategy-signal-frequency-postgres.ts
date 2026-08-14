import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
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
  strategyVersion: string,
  maxSignalsPerMinute: number,
): TradingStrategy {
  return {
    id: strategyId,
    version: strategyVersion,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'PostgreSQL frequency verification',
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

  const strategyId = `frequency-postgres-${randomUUID()
    .replaceAll('-', '')
    .slice(0, 16)}`;

  const strategyVersion = '1.0.0';

  const strategy = createStrategy(strategyId, strategyVersion, 2);

  const frequencyLockPrefix = `strategy-signal-frequency:${strategyId}:${strategyVersion}`;

  try {
    const firstBatch = await Promise.allSettled([
      runner.evaluate(strategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date(),
      }),
      runner.evaluate(strategy, {
        symbol: 'MSFT',
        evaluatedAt: new Date(Date.now() + 1),
      }),
    ]);

    const acceptedFirstBatch = firstBatch.filter(
      (result) => result.status === 'fulfilled',
    );

    const rejectedFirstBatch = firstBatch.filter(
      (result) => result.status === 'rejected',
    );

    check(
      'CONCURRENT_BATCH_HAS_AT_LEAST_ONE_ACCEPTED_SIGNAL',
      acceptedFirstBatch.length >= 1,
    );

    check(
      'CONCURRENT_BATCH_NEVER_ACCEPTS_MORE_THAN_LIMIT',
      acceptedFirstBatch.length <= 2,
    );

    const remainingCapacity = 2 - acceptedFirstBatch.length;

    for (let index = 0; index < remainingCapacity; index += 1) {
      await runner.evaluate(strategy, {
        symbol: index === 0 ? 'NVDA' : 'AMD',
        evaluatedAt: new Date(Date.now() + 10 + index),
      });
    }

    const persistedAtLimit = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion,
      },
    });

    check('EXACTLY_MAXIMUM_SIGNALS_PERSISTED', persistedAtLimit === 2);

    let thirdRejectedByFrequency = false;

    try {
      await runner.evaluate(strategy, {
        symbol: 'META',
        evaluatedAt: new Date(Date.now() + 20),
      });
    } catch (error: unknown) {
      thirdRejectedByFrequency =
        error instanceof Error &&
        error.message.includes('Strategy signal frequency limit reached');
    }

    check(
      'NEXT_DISTINCT_SIGNAL_REJECTED_BY_FREQUENCY_LIMIT',
      thirdRejectedByFrequency,
    );

    const afterRejectedCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion,
      },
    });

    check('REJECTED_SIGNAL_NOT_PERSISTED', afterRejectedCount === 2);

    const canonical = await prisma.strategySignalRecord.findFirst({
      where: {
        strategyId,
        strategyVersion,
      },
      orderBy: {
        signalAt: 'asc',
      },
    });

    check('CANONICAL_SIGNAL_AVAILABLE_FOR_DUPLICATE_TEST', canonical !== null);

    if (canonical === null) {
      throw new Error('Canonical signal missing');
    }

    const duplicate = await runner.evaluate(strategy, {
      symbol: canonical.symbol,
      evaluatedAt: new Date(canonical.evaluatedAt.getTime()),
    });

    check(
      'DUPLICATE_AT_LIMIT_RETURNS_CANONICAL_SIGNAL',
      duplicate.signalId === canonical.signalId,
    );

    const afterDuplicateCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion,
      },
    });

    check(
      'DUPLICATE_AT_LIMIT_DOES_NOT_CREATE_NEW_RECORD',
      afterDuplicateCount === 2,
    );

    const versionTwo = createStrategy(strategyId, '2.0.0', 1);

    const versionTwoSignal = await runner.evaluate(versionTwo, {
      symbol: 'TSLA',
      evaluatedAt: new Date(Date.now() + 30),
    });

    check(
      'DIFFERENT_VERSION_HAS_INDEPENDENT_FREQUENCY_LIMIT',
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
      'VERSION_COUNTS_ISOLATED',
      versionOneCount === 2 && versionTwoCount === 1,
    );

    const activeFrequencyLocks = await prisma.persistentLock.count({
      where: {
        key: {
          startsWith: `strategy-signal-frequency:${strategyId}:`,
        },
      },
    });

    check('NO_TEST_FREQUENCY_LOCKS_REMAIN', activeFrequencyLocks === 0);

    check(
      'CONCURRENT_REJECTIONS_ARE_CONSERVATIVE',
      rejectedFirstBatch.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof Error &&
          (result.reason.message.includes(
            'Strategy signal frequency evaluation is already in progress',
          ) ||
            result.reason.message.includes(
              'Strategy signal frequency limit reached',
            )),
      ),
    );

    console.log('PUNTO 259 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
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
        key: {
          startsWith: `strategy-signal-frequency:${strategyId}:`,
        },
      },
    });

    await prisma.persistentLock.deleteMany({
      where: {
        key: {
          startsWith: `strategy-signal-cooldown:${strategyId}:`,
        },
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
