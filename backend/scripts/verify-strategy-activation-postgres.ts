import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategyActivationRepository } from '../src/strategies/prisma-strategy-activation.repository';
import { StrategyActivationService } from '../src/strategies/strategy-activation.service';

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

  const repository = new PrismaStrategyActivationRepository(prisma);
  const service = new StrategyActivationService(repository);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const strategyId = `activation-${suffix}`;
  const identity = {
    strategyId,
    strategyVersion: '1.0.0',
  };

  try {
    const initial = await service.getState(identity);

    check('DEFAULT_STATE_CREATED', initial !== null);

    check('DEFAULT_STATE_ENABLED', initial.enabled === true);

    check('DEFAULT_VERSION_ZERO', initial.version === 0);

    const physicalInitial = await prisma.strategyActivationState.findUnique({
      where: {
        strategyId_strategyVersion: identity,
      },
    });

    check('DEFAULT_STATE_PHYSICALLY_PERSISTED', physicalInitial !== null);

    const disabled = await service.deactivate(identity);

    check('STRATEGY_DISABLED', disabled.enabled === false);

    check('DISABLE_INCREMENTS_VERSION', disabled.version === 1);

    const recoveredDisabled = await service.getState(identity);

    check(
      'DISABLED_STATE_RECOVERABLE',
      recoveredDisabled.enabled === false && recoveredDisabled.version === 1,
    );

    const repeatedDisable = await service.deactivate(identity);

    check(
      'REPEATED_DISABLE_IDEMPOTENT',
      repeatedDisable.enabled === false && repeatedDisable.version === 1,
    );

    const activated = await service.activate(identity);

    check('STRATEGY_REACTIVATED', activated.enabled === true);

    check('ACTIVATION_INCREMENTS_VERSION', activated.version === 2);

    const repeatedActivate = await service.activate(identity);

    check(
      'REPEATED_ACTIVATION_IDEMPOTENT',
      repeatedActivate.enabled === true && repeatedActivate.version === 2,
    );

    const versionTwo = await service.getState({
      strategyId,
      strategyVersion: '2.0.0',
    });

    check(
      'DIFFERENT_VERSION_HAS_INDEPENDENT_STATE',
      versionTwo.enabled === true && versionTwo.version === 0,
    );

    await service.deactivate({
      strategyId,
      strategyVersion: '2.0.0',
    });

    const versionOneAgain = await service.getState(identity);

    check(
      'VERSION_ONE_STATE_UNAFFECTED',
      versionOneAgain.enabled === true && versionOneAgain.version === 2,
    );

    let invalidIdRejected = false;

    try {
      await service.getState({
        strategyId: '   ',
        strategyVersion: '1.0.0',
      });
    } catch {
      invalidIdRejected = true;
    }

    check('INVALID_STRATEGY_ID_REJECTED', invalidIdRejected);

    let invalidVersionRejected = false;

    try {
      await service.getState({
        strategyId,
        strategyVersion: '   ',
      });
    } catch {
      invalidVersionRejected = true;
    }

    check('INVALID_STRATEGY_VERSION_REJECTED', invalidVersionRejected);

    const conflictIdentity = {
      strategyId: `activation-conflict-${suffix}`,
      strategyVersion: '1.0.0',
    };

    const conflictInitial = await repository.getOrCreate(conflictIdentity);

    const concurrent = await Promise.allSettled([
      repository.updateEnabled(
        conflictIdentity,
        false,
        conflictInitial.version,
      ),
      repository.updateEnabled(
        conflictIdentity,
        false,
        conflictInitial.version,
      ),
    ]);

    const fulfilled = concurrent.filter(
      (result) => result.status === 'fulfilled',
    );

    const rejected = concurrent.filter(
      (result) => result.status === 'rejected',
    );

    check('EXACTLY_ONE_CONCURRENT_UPDATE_WINS', fulfilled.length === 1);

    check('EXACTLY_ONE_STALE_UPDATE_REJECTED', rejected.length === 1);

    check(
      'STALE_UPDATE_REJECTED_BY_VERSION_CONFLICT',
      rejected.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof Error &&
          result.reason.message.includes(
            'Strategy activation state version conflict',
          ),
      ),
    );

    const conflictRecovered = await service.getState(conflictIdentity);

    check(
      'CONCURRENT_STATE_CONVERGES',
      conflictRecovered.enabled === false && conflictRecovered.version === 1,
    );

    const mutableDate = initial.updatedAt;
    mutableDate.setUTCFullYear(2035);

    const reread = await service.getState(identity);

    check(
      'RETURNED_DATES_DO_NOT_MUTATE_STORAGE',
      reread.updatedAt.getUTCFullYear() !== 2035,
    );

    console.log('PUNTO 261 PASO 2 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategyActivationState.deleteMany({
      where: {
        strategyId: {
          in: [strategyId, `activation-conflict-${suffix}`],
        },
      },
    });

    const remaining = await prisma.strategyActivationState.count({
      where: {
        strategyId: {
          in: [strategyId, `activation-conflict-${suffix}`],
        },
      },
    });

    check('TEST_ACTIVATION_RECORDS_CLEANED_UP', remaining === 0);

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
