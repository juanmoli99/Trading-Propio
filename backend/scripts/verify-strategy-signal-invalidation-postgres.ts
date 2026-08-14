import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategySignalRepository } from '../src/strategies/prisma-strategy-signal.repository';
import { StrategySignalPersistenceService } from '../src/strategies/strategy-signal-persistence.service';
import type { StrategySignal } from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
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

  const signalId = randomUUID();

  const signalAt = new Date('2026-08-13T20:00:00.000Z');

  const expiresAt = new Date('2026-08-13T20:05:00.000Z');

  const evaluatedAt = new Date('2026-08-13T19:59:59.000Z');

  const firstInvalidatedAt = new Date('2026-08-13T20:01:00.000Z');

  const secondInvalidatedAt = new Date('2026-08-13T20:02:00.000Z');

  const signal: StrategySignal = {
    signalId,
    signalAt,
    expiresAt,
    strategyId: 'invalidation-postgres-test',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt,
    confidence: 0.8,
    reason: 'PostgreSQL invalidation verification',
    invalidation: null,
  };

  let concurrentPersistedSignalId: string | null = null;

  try {
    const persisted = await persistence.persist(signal);

    check('SIGNAL_INITIAL_NOT_INVALIDATED', persisted.invalidation === null);

    const first = await persistence.invalidate(
      persisted.signalId,
      firstInvalidatedAt,
      '  Market condition changed  ',
    );

    check('INVALIDATION_PERSISTED', first.invalidation !== null);

    if (first.invalidation === null) {
      throw new Error('First invalidation unexpectedly missing');
    }

    check(
      'INVALIDATION_REASON_NORMALIZED',
      first.invalidation.reason === 'Market condition changed',
    );

    check(
      'INVALIDATION_TIMESTAMP_PRESERVED',
      first.invalidation.invalidatedAt.getTime() ===
        firstInvalidatedAt.getTime(),
    );

    const physical = await prisma.strategySignalRecord.findUnique({
      where: {
        signalId: persisted.signalId,
      },
    });

    check('RECORD_PHYSICALLY_EXISTS_IN_POSTGRESQL', physical !== null);

    if (physical === null) {
      throw new Error('Signal not found physically in PostgreSQL');
    }

    check(
      'POSTGRES_INVALIDATED_AT_CORRECT',
      physical.invalidatedAt?.getTime() === firstInvalidatedAt.getTime(),
    );

    check(
      'POSTGRES_INVALIDATION_REASON_CORRECT',
      physical.invalidationReason === 'Market condition changed',
    );

    const recovered = await persistence.getBySignalId(persisted.signalId);

    check(
      'INVALIDATION_RECOVERABLE',
      recovered !== null && recovered.invalidation !== null,
    );

    if (recovered === null || recovered.invalidation === null) {
      throw new Error('Recovered invalidation unexpectedly missing');
    }

    check(
      'RECOVERED_INVALIDATION_TIMESTAMP_CORRECT',
      recovered.invalidation.invalidatedAt.getTime() ===
        firstInvalidatedAt.getTime(),
    );

    check(
      'RECOVERED_INVALIDATION_REASON_CORRECT',
      recovered.invalidation.reason === 'Market condition changed',
    );

    const second = await persistence.invalidate(
      persisted.signalId,
      secondInvalidatedAt,
      'Second invalidation must not overwrite first',
    );

    check('REPEATED_INVALIDATION_IDEMPOTENT', second.invalidation !== null);

    if (second.invalidation === null) {
      throw new Error('Second invalidation unexpectedly missing');
    }

    check(
      'SECOND_INVALIDATION_DOES_NOT_OVERWRITE_TIMESTAMP',
      second.invalidation.invalidatedAt.getTime() ===
        firstInvalidatedAt.getTime(),
    );

    check(
      'SECOND_INVALIDATION_DOES_NOT_OVERWRITE_REASON',
      second.invalidation.reason === 'Market condition changed',
    );

    const concurrentRequestedSignalId = randomUUID();

    const concurrentEvaluatedAt = new Date('2026-08-13T20:02:59.000Z');

    const concurrentSignal = await persistence.persist({
      ...signal,
      signalId: concurrentRequestedSignalId,
      signalAt: new Date('2026-08-13T20:03:00.000Z'),
      expiresAt: new Date('2026-08-13T20:08:00.000Z'),
      evaluatedAt: concurrentEvaluatedAt,
      reason: 'Concurrent invalidation verification',
      invalidation: null,
    });

    concurrentPersistedSignalId = concurrentSignal.signalId;

    check(
      'CONCURRENT_SIGNAL_PERSISTED_AS_DISTINCT_RECORD',
      concurrentSignal.signalId === concurrentRequestedSignalId,
    );

    check(
      'CONCURRENT_SIGNAL_HAS_DISTINCT_EVALUATION',
      concurrentSignal.evaluatedAt.getTime() ===
        concurrentEvaluatedAt.getTime() &&
        concurrentSignal.evaluatedAt.getTime() !==
          persisted.evaluatedAt.getTime(),
    );

    const concurrentPhysicalBeforeInvalidation =
      await prisma.strategySignalRecord.findUnique({
        where: {
          signalId: concurrentSignal.signalId,
        },
      });

    check(
      'CONCURRENT_SIGNAL_PHYSICALLY_EXISTS_BEFORE_INVALIDATION',
      concurrentPhysicalBeforeInvalidation !== null,
    );

    const concurrentAtA = new Date('2026-08-13T20:03:30.000Z');

    const concurrentAtB = new Date('2026-08-13T20:04:00.000Z');

    const [concurrentA, concurrentB] = await Promise.all([
      persistence.invalidate(
        concurrentSignal.signalId,
        concurrentAtA,
        'Concurrent invalidation A',
      ),
      persistence.invalidate(
        concurrentSignal.signalId,
        concurrentAtB,
        'Concurrent invalidation B',
      ),
    ]);

    check(
      'CONCURRENT_INVALIDATIONS_RETURN_INVALIDATED_SIGNAL',
      concurrentA.invalidation !== null && concurrentB.invalidation !== null,
    );

    if (
      concurrentA.invalidation === null ||
      concurrentB.invalidation === null
    ) {
      throw new Error('Concurrent invalidation unexpectedly missing');
    }

    const concurrentRecovered = await persistence.getBySignalId(
      concurrentSignal.signalId,
    );

    check(
      'CONCURRENT_INVALIDATION_RECOVERABLE',
      concurrentRecovered !== null && concurrentRecovered.invalidation !== null,
    );

    if (
      concurrentRecovered === null ||
      concurrentRecovered.invalidation === null
    ) {
      throw new Error('Concurrent invalidation recovery failed');
    }

    const storedTimestamp =
      concurrentRecovered.invalidation.invalidatedAt.getTime();

    const storedReason = concurrentRecovered.invalidation.reason;

    const winnerIsA =
      storedTimestamp === concurrentAtA.getTime() &&
      storedReason === 'Concurrent invalidation A';

    const winnerIsB =
      storedTimestamp === concurrentAtB.getTime() &&
      storedReason === 'Concurrent invalidation B';

    check('EXACTLY_ONE_CONCURRENT_INVALIDATION_WINS', winnerIsA !== winnerIsB);

    check(
      'CONCURRENT_RESULTS_CONVERGE_TO_STORED_INVALIDATION',
      concurrentA.invalidation.invalidatedAt.getTime() === storedTimestamp &&
        concurrentB.invalidation.invalidatedAt.getTime() === storedTimestamp &&
        concurrentA.invalidation.reason === storedReason &&
        concurrentB.invalidation.reason === storedReason,
    );

    const concurrentPhysical = await prisma.strategySignalRecord.findUnique({
      where: {
        signalId: concurrentSignal.signalId,
      },
    });

    check('CONCURRENT_POSTGRES_RECORD_EXISTS', concurrentPhysical !== null);

    if (concurrentPhysical === null) {
      throw new Error('Concurrent signal missing in PostgreSQL');
    }

    check(
      'CONCURRENT_POSTGRES_HAS_SINGLE_INVALIDATION',
      concurrentPhysical.invalidatedAt?.getTime() === storedTimestamp &&
        concurrentPhysical.invalidationReason === storedReason,
    );

    check(
      'SOURCE_FIRST_INVALIDATION_TIMESTAMP_NOT_MUTATED',
      firstInvalidatedAt.toISOString() === '2026-08-13T20:01:00.000Z',
    );

    check(
      'SOURCE_SECOND_INVALIDATION_TIMESTAMP_NOT_MUTATED',
      secondInvalidatedAt.toISOString() === '2026-08-13T20:02:00.000Z',
    );

    console.log('PUNTO 256 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        signalId: {
          in: [
            signalId,
            ...(concurrentPersistedSignalId === null
              ? []
              : [concurrentPersistedSignalId]),
          ],
        },
      },
    });

    const remaining = await prisma.strategySignalRecord.count({
      where: {
        signalId: {
          in: [
            signalId,
            ...(concurrentPersistedSignalId === null
              ? []
              : [concurrentPersistedSignalId]),
          ],
        },
      },
    });

    check('TEST_RECORDS_CLEANED_UP', remaining === 0);

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
