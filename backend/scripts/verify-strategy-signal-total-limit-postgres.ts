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
  symbol: string,
  action: 'BUY' | 'SELL',
  evaluatedAt: Date,
): StrategySignal {
  const signalAt = new Date(evaluatedAt.getTime() + 1_000);

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
    configurationSnapshot: {},
    reason: 'Total signal limit PostgreSQL verification',
    invalidation: null,
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

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);

  const strategyId = `total-limit-${suffix}`;

  try {
    await persistence.persist(
      createSignal(
        strategyId,
        '1.0.0',
        'AAPL',
        'BUY',
        new Date('2026-08-14T01:00:00.000Z'),
      ),
    );

    await persistence.persist(
      createSignal(
        strategyId,
        '1.0.0',
        'MSFT',
        'SELL',
        new Date('2026-08-14T01:01:00.000Z'),
      ),
    );

    await persistence.persist(
      createSignal(
        strategyId,
        '1.0.0',
        'NVDA',
        'BUY',
        new Date('2026-08-14T01:02:00.000Z'),
      ),
    );

    await persistence.persist(
      createSignal(
        strategyId,
        '2.0.0',
        'AMD',
        'BUY',
        new Date('2026-08-14T01:03:00.000Z'),
      ),
    );

    const versionOneCount = await persistence.countForTotalLimit({
      strategyId,
      strategyVersion: '1.0.0',
    });

    check('TOTAL_SIGNAL_COUNT_CORRECT', versionOneCount === 3);

    check('DIFFERENT_SYMBOLS_INCLUDED', versionOneCount === 3);

    check('DIFFERENT_ACTIONS_INCLUDED', versionOneCount === 3);

    const versionTwoCount = await persistence.countForTotalLimit({
      strategyId,
      strategyVersion: '2.0.0',
    });

    check('STRATEGY_VERSION_ISOLATED', versionTwoCount === 1);

    const missingCount = await persistence.countForTotalLimit({
      strategyId: `missing-${suffix}`,
      strategyVersion: '1.0.0',
    });

    check('MISSING_STRATEGY_RETURNS_ZERO', missingCount === 0);

    let invalidStrategyIdRejected = false;

    try {
      await persistence.countForTotalLimit({
        strategyId: '   ',
        strategyVersion: '1.0.0',
      });
    } catch {
      invalidStrategyIdRejected = true;
    }

    check('INVALID_STRATEGY_ID_REJECTED', invalidStrategyIdRejected);

    let invalidVersionRejected = false;

    try {
      await persistence.countForTotalLimit({
        strategyId,
        strategyVersion: '   ',
      });
    } catch {
      invalidVersionRejected = true;
    }

    check('INVALID_STRATEGY_VERSION_REJECTED', invalidVersionRejected);

    console.log('PUNTO 260 PASO 3 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
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




