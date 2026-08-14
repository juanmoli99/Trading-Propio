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

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function createSignal(
  strategyId: string,
  strategyVersion: string,
  symbol: string,
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
    symbol,
    action,
    evaluatedAt,
    confidence: 0.8,
    reason: 'Frequency lookup verification',
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

  const strategyId = `frequency-lookup-${randomUUID()
    .replaceAll('-', '')
    .slice(0, 16)}`;

  try {
    const signals = [
      createSignal(
        strategyId,
        '1.0.0',
        'AAPL',
        'BUY',
        new Date('2026-08-14T01:00:00.000Z'),
        new Date('2026-08-14T00:59:59.000Z'),
      ),
      createSignal(
        strategyId,
        '1.0.0',
        'MSFT',
        'SELL',
        new Date('2026-08-14T01:00:20.000Z'),
        new Date('2026-08-14T01:00:19.000Z'),
      ),
      createSignal(
        strategyId,
        '1.0.0',
        'NVDA',
        'BUY',
        new Date('2026-08-14T01:00:59.999Z'),
        new Date('2026-08-14T01:00:58.999Z'),
      ),
      createSignal(
        strategyId,
        '1.0.0',
        'AMD',
        'BUY',
        new Date('2026-08-14T00:59:59.999Z'),
        new Date('2026-08-14T00:59:58.999Z'),
      ),
      createSignal(
        strategyId,
        '2.0.0',
        'AAPL',
        'BUY',
        new Date('2026-08-14T01:00:30.000Z'),
        new Date('2026-08-14T01:00:29.000Z'),
      ),
    ];

    for (const signal of signals) {
      await persistence.persist(signal);
    }

    const windowStart = new Date('2026-08-14T01:00:00.000Z');
    const referenceAt = new Date('2026-08-14T01:01:00.000Z');

    const count = await persistence.countForFrequency({
      strategyId,
      strategyVersion: '1.0.0',
      windowStart,
      referenceAt,
    });

    check('FREQUENCY_COUNT_CORRECT', count === 3);

    check('WINDOW_START_IS_INCLUSIVE', count >= 1);

    check('DIFFERENT_SYMBOLS_INCLUDED', count === 3);

    check('DIFFERENT_ACTIONS_INCLUDED', count === 3);

    const otherVersionCount = await persistence.countForFrequency({
      strategyId,
      strategyVersion: '2.0.0',
      windowStart,
      referenceAt,
    });

    check('STRATEGY_VERSION_ISOLATED', otherVersionCount === 1);

    const emptyCount = await persistence.countForFrequency({
      strategyId,
      strategyVersion: '3.0.0',
      windowStart,
      referenceAt,
    });

    check('EMPTY_WINDOW_RETURNS_ZERO', emptyCount === 0);

    check(
      'SOURCE_WINDOW_START_NOT_MUTATED',
      windowStart.toISOString() === '2026-08-14T01:00:00.000Z',
    );

    check(
      'SOURCE_REFERENCE_AT_NOT_MUTATED',
      referenceAt.toISOString() === '2026-08-14T01:01:00.000Z',
    );

    await expectReject('INVALID_WINDOW_ORDER_REJECTED', () =>
      persistence.countForFrequency({
        strategyId,
        strategyVersion: '1.0.0',
        windowStart: new Date('2026-08-14T01:01:00.000Z'),
        referenceAt: new Date('2026-08-14T01:01:00.000Z'),
      }),
    );

    await expectReject('INVALID_WINDOW_START_REJECTED', () =>
      persistence.countForFrequency({
        strategyId,
        strategyVersion: '1.0.0',
        windowStart: new Date(Number.NaN),
        referenceAt,
      }),
    );

    await expectReject('INVALID_REFERENCE_AT_REJECTED', () =>
      persistence.countForFrequency({
        strategyId,
        strategyVersion: '1.0.0',
        windowStart,
        referenceAt: new Date(Number.NaN),
      }),
    );

    console.log('PUNTO 259 PASO 3 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
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
