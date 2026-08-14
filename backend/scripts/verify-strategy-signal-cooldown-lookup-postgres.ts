import 'dotenv/config';
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

function createSignal(
  strategyId: string,
  strategyVersion: string,
  action: 'BUY' | 'SELL',
  signalAt: Date,
  evaluatedAt: Date,
): StrategySignal {
  return {
    signalId: randomUUID(),
    signalAt,
    expiresAt: new Date(signalAt.getTime() + 300_000),
    strategyId,
    strategyVersion,
    symbol: 'AAPL',
    action,
    evaluatedAt,
    confidence: 0.8,
    reason: 'Cooldown lookup verification',
    invalidation: null,
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL verification');
  }

  const prisma = new PrismaService(
    new ConfigService({
      database: {
        url: databaseUrl,
      },
    }),
  );

  await prisma.$connect();

  const repository = new PrismaStrategySignalRepository(prisma);
  const persistence = new StrategySignalPersistenceService(repository);

  const strategyId = `cooldown-lookup-${randomUUID()
    .replaceAll('-', '')
    .slice(0, 16)}`;

  try {
    const first = createSignal(
      strategyId,
      '1.0.0',
      'BUY',
      new Date('2026-08-13T23:10:00.000Z'),
      new Date('2026-08-13T23:09:59.000Z'),
    );

    const second = createSignal(
      strategyId,
      '1.0.0',
      'BUY',
      new Date('2026-08-13T23:12:00.000Z'),
      new Date('2026-08-13T23:11:59.000Z'),
    );

    const otherVersion = createSignal(
      strategyId,
      '2.0.0',
      'BUY',
      new Date('2026-08-13T23:13:00.000Z'),
      new Date('2026-08-13T23:12:59.000Z'),
    );

    const otherAction = createSignal(
      strategyId,
      '1.0.0',
      'SELL',
      new Date('2026-08-13T23:14:00.000Z'),
      new Date('2026-08-13T23:13:59.000Z'),
    );

    await persistence.persist(first);
    await persistence.persist(second);
    await persistence.persist(otherVersion);
    await persistence.persist(otherAction);

    const latest = await persistence.getLatestForCooldown({
      strategyId,
      strategyVersion: '1.0.0',
      symbol: ' aapl ',
      action: 'BUY',
    });

    check('LATEST_COOLDOWN_SIGNAL_FOUND', latest !== null);

    if (latest === null) {
      throw new Error('Latest cooldown signal unexpectedly missing');
    }

    check('LATEST_SIGNAL_SELECTED', latest.signalId === second.signalId);

    check(
      'LATEST_SIGNAL_AT_SELECTED',
      latest.signalAt.toISOString() === '2026-08-13T23:12:00.000Z',
    );

    check(
      'STRATEGY_VERSION_FILTER_APPLIED',
      latest.strategyVersion === '1.0.0',
    );

    check('SYMBOL_FILTER_NORMALIZED', latest.symbol === 'AAPL');

    check('ACTION_FILTER_APPLIED', latest.action === 'BUY');

    check(
      'OTHER_VERSION_NOT_SELECTED',
      latest.signalId !== otherVersion.signalId,
    );

    check(
      'OTHER_ACTION_NOT_SELECTED',
      latest.signalId !== otherAction.signalId,
    );

    const missing = await persistence.getLatestForCooldown({
      strategyId,
      strategyVersion: '3.0.0',
      symbol: 'AAPL',
      action: 'BUY',
    });

    check('MISSING_IDENTITY_RETURNS_NULL', missing === null);

    const originalLatestTime = latest.signalAt.getTime();

    latest.signalAt.setUTCFullYear(2035);

    const reread = await persistence.getLatestForCooldown({
      strategyId,
      strategyVersion: '1.0.0',
      symbol: 'AAPL',
      action: 'BUY',
    });

    check(
      'LATEST_RESULT_DEFENSIVELY_COPIED',
      reread !== null && reread.signalAt.getTime() === originalLatestTime,
    );

    console.log('PUNTO 258 PASO 3 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        strategyId,
      },
    });

    const remaining = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
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
