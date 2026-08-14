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
import type { TradingStrategy } from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createStrategy(strategyId: string): TradingStrategy {
  return {
    id: strategyId,
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: 300,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'PostgreSQL cooldown verification',
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

  const persistentLockService = new PersistentLockService(prisma);
  const repository = new PrismaStrategySignalRepository(prisma);
  const persistence = new StrategySignalPersistenceService(repository);
  const validation = new StrategyValidationService();

  const activationRepository = new PrismaStrategyActivationRepository(prisma);

  const activationService = new StrategyActivationService(activationRepository);

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    persistentLockService,
    activationService,
  );

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);

  const concurrencyStrategyId = `cooldown-concurrency-${suffix}`;
  const sequentialStrategyId = `cooldown-sequential-${suffix}`;
  const duplicateStrategyId = `cooldown-duplicate-${suffix}`;

  const strategyIds = [
    concurrencyStrategyId,
    sequentialStrategyId,
    duplicateStrategyId,
  ];

  try {
    /*
     * ESCENARIO 1:
     * Dos seÃƒÆ’Ã‚Â±ales nuevas concurrentes para la misma identidad.
     *
     * Ambas tienen distinto evaluatedAt, por lo que NO son duplicados del
     * punto 257. El lock debe permitir que solo una entre en la secciÃƒÆ’Ã‚Â³n
     * crÃƒÆ’Ã‚Â­tica.
     */
    const concurrentStrategy = createStrategy(concurrencyStrategyId);

    const concurrentResults = await Promise.allSettled([
      runner.evaluate(concurrentStrategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-14T00:00:00.000Z'),
      }),

      runner.evaluate(concurrentStrategy, {
        symbol: 'AAPL',
        evaluatedAt: new Date('2026-08-14T00:00:01.000Z'),
      }),
    ]);

    const concurrentFulfilled = concurrentResults.filter(
      (result) => result.status === 'fulfilled',
    );

    const concurrentRejected = concurrentResults.filter(
      (result) => result.status === 'rejected',
    );

    check(
      'EXACTLY_ONE_CONCURRENT_SIGNAL_ACCEPTED',
      concurrentFulfilled.length === 1,
    );

    check(
      'EXACTLY_ONE_CONCURRENT_SIGNAL_REJECTED',
      concurrentRejected.length === 1,
    );

    const contentionRejected = concurrentRejected.some(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof Error &&
        (result.reason.message.includes(
          'Strategy signal cooldown evaluation is already in progress',
        ) ||
          result.reason.message.includes(
            'Strategy signal frequency evaluation is already in progress',
          )),
    );

    check('CONCURRENT_REJECTION_CAUSED_BY_PERSISTENT_LOCK', contentionRejected);

    const concurrentRecords = await prisma.strategySignalRecord.findMany({
      where: {
        strategyId: concurrencyStrategyId,
      },
    });

    check(
      'EXACTLY_ONE_CONCURRENT_SIGNAL_PERSISTED',
      concurrentRecords.length === 1,
    );

    const concurrentLocks = await prisma.persistentLock.count({
      where: {
        key: {
          contains: concurrencyStrategyId,
        },
      },
    });

    check('CONCURRENT_COOLDOWN_LOCK_RELEASED', concurrentLocks === 0);

    /*
     * ESCENARIO 2:
     * Una primera seÃƒÆ’Ã‚Â±al entra normalmente.
     * Una segunda seÃƒÆ’Ã‚Â±al distinta se intenta inmediatamente despuÃƒÆ’Ã‚Â©s.
     * Debe rechazarse por cooldown, no por deduplicaciÃƒÆ’Ã‚Â³n.
     */
    const sequentialStrategy = createStrategy(sequentialStrategyId);

    const first = await runner.evaluate(sequentialStrategy, {
      symbol: 'MSFT',
      evaluatedAt: new Date('2026-08-14T00:10:00.000Z'),
    });

    check(
      'FIRST_SEQUENTIAL_SIGNAL_ACCEPTED',
      first.strategyId === sequentialStrategyId && first.symbol === 'MSFT',
    );

    let cooldownRejected = false;

    try {
      await runner.evaluate(sequentialStrategy, {
        symbol: 'MSFT',
        evaluatedAt: new Date('2026-08-14T00:10:01.000Z'),
      });
    } catch (error: unknown) {
      cooldownRejected =
        error instanceof Error &&
        error.message.includes('Strategy signal cooldown is active until');
    }

    check('SECOND_DISTINCT_SIGNAL_REJECTED_BY_COOLDOWN', cooldownRejected);

    const sequentialRecords = await prisma.strategySignalRecord.findMany({
      where: {
        strategyId: sequentialStrategyId,
      },
    });

    check(
      'COOLDOWN_REJECTION_DOES_NOT_PERSIST_SIGNAL',
      sequentialRecords.length === 1,
    );

    check(
      'ORIGINAL_SIGNAL_REMAINS_PERSISTED',
      sequentialRecords[0]?.signalId === first.signalId,
    );

    const sequentialLocks = await prisma.persistentLock.count({
      where: {
        key: {
          contains: sequentialStrategyId,
        },
      },
    });

    check('LOCK_RELEASED_AFTER_COOLDOWN_REJECTION', sequentialLocks === 0);

    /*
     * ESCENARIO 3:
     * Un duplicado exacto del punto 257 no debe ser tratado como una nueva
     * seÃƒÆ’Ã‚Â±al bloqueada. Debe devolverse la seÃƒÆ’Ã‚Â±al canÃƒÆ’Ã‚Â³nica existente.
     */
    const duplicateStrategy = createStrategy(duplicateStrategyId);

    const duplicateEvaluatedAt = new Date('2026-08-14T00:20:00.000Z');

    const canonical = await runner.evaluate(duplicateStrategy, {
      symbol: 'NVDA',
      evaluatedAt: duplicateEvaluatedAt,
    });

    const duplicate = await runner.evaluate(duplicateStrategy, {
      symbol: 'NVDA',
      evaluatedAt: duplicateEvaluatedAt,
    });

    check(
      'EXACT_DUPLICATE_RETURNS_CANONICAL_SIGNAL',
      duplicate.signalId === canonical.signalId,
    );

    check(
      'EXACT_DUPLICATE_PRESERVES_CANONICAL_SIGNAL_AT',
      duplicate.signalAt.getTime() === canonical.signalAt.getTime(),
    );

    check(
      'EXACT_DUPLICATE_PRESERVES_CANONICAL_REASON',
      duplicate.reason === canonical.reason,
    );

    const duplicateRecords = await prisma.strategySignalRecord.findMany({
      where: {
        strategyId: duplicateStrategyId,
      },
    });

    check(
      'EXACT_DUPLICATE_DOES_NOT_CREATE_SECOND_RECORD',
      duplicateRecords.length === 1,
    );

    const duplicateLocks = await prisma.persistentLock.count({
      where: {
        key: {
          contains: duplicateStrategyId,
        },
      },
    });

    check('DUPLICATE_COOLDOWN_LOCK_RELEASED', duplicateLocks === 0);

    /*
     * VerificaciÃƒÆ’Ã‚Â³n global de residuos de locks.
     */
    const remainingTestLocks = await prisma.persistentLock.count({
      where: {
        OR: strategyIds.map((strategyId) => ({
          key: {
            contains: strategyId,
          },
        })),
      },
    });

    check('NO_TEST_COOLDOWN_LOCKS_REMAIN', remainingTestLocks === 0);

    console.log('PUNTO 258 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        strategyId: {
          in: strategyIds,
        },
      },
    });

    await prisma.strategyActivationState.deleteMany({
      where: {
        strategyId: {
          in: strategyIds,
        },
      },
    });

    await prisma.persistentLock.deleteMany({
      where: {
        OR: strategyIds.map((strategyId) => ({
          key: {
            contains: strategyId,
          },
        })),
      },
    });

    const remainingSignals = await prisma.strategySignalRecord.count({
      where: {
        strategyId: {
          in: strategyIds,
        },
      },
    });

    const remainingActivationStates =
      await prisma.strategyActivationState.count({
        where: {
          strategyId: {
            in: strategyIds,
          },
        },
      });

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        OR: strategyIds.map((strategyId) => ({
          key: {
            contains: strategyId,
          },
        })),
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

