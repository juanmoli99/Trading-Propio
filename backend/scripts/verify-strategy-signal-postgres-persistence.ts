import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
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

  const sourceSignalAt = new Date('2026-08-13T16:30:01.000Z');

  const sourceExpiresAt = new Date('2026-08-13T16:35:01.000Z');
  const sourceEvaluatedAt = new Date('2026-08-13T16:30:00.000Z');

  const signal: StrategySignal = {
    signalId,
    signalAt: sourceSignalAt,
    expiresAt: sourceExpiresAt,
    invalidation: null,
    strategyId: 'postgres-verification-strategy',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt: sourceEvaluatedAt,
    confidence: 0.875,
    reason: 'PostgreSQL persistence verification',
    configurationSnapshot: {},
  };

  try {
    const persisted = await persistence.persist(signal);

    check('PERSIST_RETURNED_SIGNAL_ID', persisted.signalId === signalId);

    check(
      'STRATEGY_ID_PERSISTED',
      persisted.strategyId === 'postgres-verification-strategy',
    );

    check('STRATEGY_VERSION_PERSISTED', persisted.strategyVersion === '1.0.0');

    check('SYMBOL_PERSISTED', persisted.symbol === 'AAPL');

    check('ACTION_PERSISTED', persisted.action === 'BUY');

    check('CONFIDENCE_PERSISTED', persisted.confidence === 0.875);

    check(
      'REASON_PERSISTED',
      persisted.reason === 'PostgreSQL persistence verification',
    );

    check(
      'SIGNAL_AT_PERSISTED',
      persisted.signalAt.getTime() === sourceSignalAt.getTime(),
    );

    check(
      'EXPIRES_AT_PERSISTED',
      persisted.expiresAt.getTime() === sourceExpiresAt.getTime(),
    );

    check(
      'EVALUATED_AT_PERSISTED',
      persisted.evaluatedAt.getTime() === sourceEvaluatedAt.getTime(),
    );

    check('CREATED_AT_VALID', Number.isFinite(persisted.createdAt.getTime()));

    const physicalRecord = await prisma.strategySignalRecord.findUnique({
      where: {
        signalId,
      },
    });

    check('RECORD_PHYSICALLY_EXISTS_IN_POSTGRESQL', physicalRecord !== null);

    if (physicalRecord === null) {
      throw new Error('Physical PostgreSQL signal record missing');
    }

    check('POSTGRES_SIGNAL_ID_CORRECT', physicalRecord.signalId === signalId);

    check(
      'POSTGRES_STRATEGY_ID_CORRECT',
      physicalRecord.strategyId === 'postgres-verification-strategy',
    );

    check(
      'POSTGRES_STRATEGY_VERSION_CORRECT',
      physicalRecord.strategyVersion === '1.0.0',
    );

    check('POSTGRES_SYMBOL_CORRECT', physicalRecord.symbol === 'AAPL');

    check('POSTGRES_ACTION_CORRECT', physicalRecord.action === 'BUY');

    check(
      'POSTGRES_CONFIDENCE_CORRECT',
      Number(physicalRecord.confidence) === 0.875,
    );

    check(
      'POSTGRES_REASON_CORRECT',
      physicalRecord.reason === 'PostgreSQL persistence verification',
    );

    const recovered = await persistence.getBySignalId(signalId);

    check('RECOVERED_BY_SIGNAL_ID', recovered !== null);

    if (recovered === null) {
      throw new Error('Signal recovery unexpectedly returned null');
    }

    check(
      'RECOVERED_RECORD_COMPLETE',
      recovered.signalId === signalId &&
        recovered.strategyId === 'postgres-verification-strategy' &&
        recovered.strategyVersion === '1.0.0' &&
        recovered.expiresAt.getTime() === sourceExpiresAt.getTime() &&
        recovered.symbol === 'AAPL' &&
        recovered.action === 'BUY' &&
        recovered.confidence === 0.875 &&
        recovered.reason === 'PostgreSQL persistence verification',
    );

    const history = await persistence.getHistory({
      strategyId: 'postgres-verification-strategy',
      symbol: ' aapl ',
      action: 'BUY',
      limit: 10,
    });

    check(
      'HISTORY_CONTAINS_SIGNAL',
      history.some((item) => item.signalId === signalId),
    );

    check(
      'HISTORY_SYMBOL_FILTER_NORMALIZED',
      history.every((item) => item.symbol === 'AAPL'),
    );

    check(
      'HISTORY_ACTION_FILTER_APPLIED',
      history.every((item) => item.action === 'BUY'),
    );

    check(
      'SOURCE_SIGNAL_AT_NOT_MUTATED',
      sourceSignalAt.toISOString() === '2026-08-13T16:30:01.000Z',
    );

    check(
      'SOURCE_EVALUATED_AT_NOT_MUTATED',
      sourceEvaluatedAt.toISOString() === '2026-08-13T16:30:00.000Z',
    );

    persisted.signalAt.setUTCFullYear(2030);

    persisted.evaluatedAt.setUTCFullYear(2030);

    const reread = await persistence.getBySignalId(signalId);

    check(
      'MUTATING_RETURNED_DATES_DOES_NOT_MUTATE_DB',
      reread !== null &&
        reread.signalAt.toISOString() === '2026-08-13T16:30:01.000Z' &&
        reread.evaluatedAt.toISOString() === '2026-08-13T16:30:00.000Z',
    );

    const duplicateResult = await persistence.persist(signal);

    check(
      'DUPLICATE_SIGNAL_RETURNS_CANONICAL_RECORD',
      duplicateResult.signalId === signalId,
    );

    const duplicateCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId: signal.strategyId,
        strategyVersion: signal.strategyVersion,
        symbol: signal.symbol,
        action: signal.action,
        evaluatedAt: sourceEvaluatedAt,
      },
    });

    check(
      'DUPLICATE_SIGNAL_DOES_NOT_CREATE_SECOND_RECORD',
      duplicateCount === 1,
    );

    console.log('PUNTO 254 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    const deleted = await prisma.strategySignalRecord.deleteMany({
      where: {
        signalId,
      },
    });

    check('TEST_RECORD_CLEANED_UP', deleted.count <= 1);

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


