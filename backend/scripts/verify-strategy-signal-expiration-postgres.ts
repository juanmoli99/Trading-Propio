import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategySignalRepository } from '../src/strategies/prisma-strategy-signal.repository';
import {
  isStrategySignalExpired,
  type StrategySignal,
} from '../src/strategies/strategy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const configService = new ConfigService({
    database: {
      url: process.env.DATABASE_URL,
    },
  });

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const repository = new PrismaStrategySignalRepository(prisma);

  const signalId = randomUUID();

  const signalAt = new Date('2026-08-13T18:00:00.000Z');

  const expiresAt = new Date('2026-08-13T18:05:00.000Z');

  const evaluatedAt = new Date('2026-08-13T17:59:59.000Z');

  const signal: StrategySignal = {
    signalId,
    signalAt,
    expiresAt,
    invalidation: null,
    strategyId: 'expiration-postgres-test',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt,
    confidence: 0.8,
    reason: 'PostgreSQL expiration verification',
  };

  try {
    const persisted = await repository.save(signal);

    check('PERSIST_RETURNED_SIGNAL_ID', persisted.signalId === signalId);

    check(
      'EXPIRES_AT_PERSISTED',
      persisted.expiresAt.getTime() === expiresAt.getTime(),
    );

    check(
      'EXPIRATION_AFTER_SIGNAL_AT',
      persisted.expiresAt.getTime() > persisted.signalAt.getTime(),
    );

    const physical = await prisma.strategySignalRecord.findUnique({
      where: {
        signalId,
      },
    });

    check('RECORD_PHYSICALLY_EXISTS_IN_POSTGRESQL', physical !== null);

    if (physical === null) {
      throw new Error('Persisted signal not found physically in PostgreSQL');
    }

    check(
      'POSTGRES_EXPIRES_AT_CORRECT',
      physical.expiresAt.getTime() === expiresAt.getTime(),
    );

    check(
      'POSTGRES_SIGNAL_AT_CORRECT',
      physical.signalAt.getTime() === signalAt.getTime(),
    );

    const recovered = await repository.findBySignalId(signalId);

    check('RECOVERED_BY_SIGNAL_ID', recovered !== null);

    if (recovered === null) {
      throw new Error('Signal could not be recovered by signal ID');
    }

    check(
      'RECOVERED_EXPIRES_AT_CORRECT',
      recovered.expiresAt.getTime() === expiresAt.getTime(),
    );

    check(
      'RECOVERED_SIGNAL_AT_CORRECT',
      recovered.signalAt.getTime() === signalAt.getTime(),
    );

    check(
      'NOT_EXPIRED_BEFORE_EXPIRATION',
      !isStrategySignalExpired(
        recovered.expiresAt,
        new Date('2026-08-13T18:04:59.999Z'),
      ),
    );

    check(
      'EXPIRED_EXACTLY_AT_EXPIRATION',
      isStrategySignalExpired(
        recovered.expiresAt,
        new Date('2026-08-13T18:05:00.000Z'),
      ),
    );

    check(
      'EXPIRED_AFTER_EXPIRATION',
      isStrategySignalExpired(
        recovered.expiresAt,
        new Date('2026-08-13T18:05:00.001Z'),
      ),
    );

    const originalRecoveredExpiration = recovered.expiresAt.getTime();

    recovered.expiresAt.setUTCFullYear(2030);

    const recoveredAgain = await repository.findBySignalId(signalId);

    check('RECOVERED_AGAIN_AFTER_MUTATION', recoveredAgain !== null);

    if (recoveredAgain === null) {
      throw new Error('Signal could not be recovered after mutation test');
    }

    check(
      'MUTATING_RETURNED_EXPIRATION_DOES_NOT_MUTATE_DB',
      recoveredAgain.expiresAt.getTime() === originalRecoveredExpiration,
    );

    check(
      'SOURCE_SIGNAL_AT_NOT_MUTATED',
      signalAt.toISOString() === '2026-08-13T18:00:00.000Z',
    );

    check(
      'SOURCE_EXPIRES_AT_NOT_MUTATED',
      expiresAt.toISOString() === '2026-08-13T18:05:00.000Z',
    );

    check(
      'SOURCE_EVALUATED_AT_NOT_MUTATED',
      evaluatedAt.toISOString() === '2026-08-13T17:59:59.000Z',
    );

    console.log('PUNTO 255 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySignalRecord.deleteMany({
      where: {
        signalId,
      },
    });

    const remaining = await prisma.strategySignalRecord.findUnique({
      where: {
        signalId,
      },
    });

    check('TEST_RECORD_CLEANED_UP', remaining === null);

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
