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
  counter: { value: number },
): TradingStrategy {
  return {
    id: strategyId,
    version,
    signalValiditySeconds: 300,
    signalCooldownSeconds: 0,
    maxSignalsPerMinute: 60,
    maxSignals: 100,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      counter.value += 1;

      return {
        strategyId,
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'PostgreSQL activation runner verification',
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

  const activationRepository = new PrismaStrategyActivationRepository(prisma);

  const activationService = new StrategyActivationService(activationRepository);

  const signalRepository = new PrismaStrategySignalRepository(prisma);

  const persistence = new StrategySignalPersistenceService(signalRepository);

  const lockService = new PersistentLockService(prisma);
  const validation = new StrategyValidationService();

  const runner = new StrategyRunnerService(
    validation,
    persistence,
    lockService,
    activationService,
  );

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const strategyId = `activation-runner-${suffix}`;

  const versionOneCounter = { value: 0 };
  const versionTwoCounter = { value: 0 };

  const versionOne = createStrategy(strategyId, '1.0.0', versionOneCounter);

  const versionTwo = createStrategy(strategyId, '2.0.0', versionTwoCounter);

  try {
    /*
     * ESCENARIO 1:
     * Una estrategia sin estado previo debe crearse habilitada
     * y poder ejecutar normalmente.
     */
    const first = await runner.evaluate(versionOne, {
      symbol: 'AAPL',
      evaluatedAt: new Date('2026-08-14T04:00:00.000Z'),
    });

    check(
      'DEFAULT_ENABLED_STRATEGY_ACCEPTED',
      first.strategyId === strategyId &&
        first.strategyVersion === '1.0.0' &&
        first.symbol === 'AAPL',
    );

    check('DEFAULT_ENABLED_STRATEGY_EXECUTED', versionOneCounter.value === 1);

    const initialState = await prisma.strategyActivationState.findUnique({
      where: {
        strategyId_strategyVersion: {
          strategyId,
          strategyVersion: '1.0.0',
        },
      },
    });

    check('DEFAULT_ACTIVATION_STATE_PHYSICALLY_CREATED', initialState !== null);

    check('DEFAULT_ACTIVATION_STATE_ENABLED', initialState?.enabled === true);

    const initialSignalCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check('DEFAULT_ENABLED_SIGNAL_PERSISTED', initialSignalCount === 1);

    /*
     * ESCENARIO 2:
     * Desactivar debe impedir completamente la evaluaciÃ³n.
     */
    const disabled = await activationService.deactivate({
      strategyId,
      strategyVersion: '1.0.0',
    });

    check('STRATEGY_DISABLED', disabled.enabled === false);

    check('DISABLE_VERSION_INCREMENTED', disabled.version === 1);

    let disabledRejected = false;

    try {
      await runner.evaluate(versionOne, {
        symbol: 'MSFT',
        evaluatedAt: new Date('2026-08-14T04:01:00.000Z'),
      });
    } catch (error: unknown) {
      disabledRejected =
        error instanceof Error &&
        error.message.includes(`Strategy is disabled: ${strategyId}@1.0.0`);
    }

    check('DISABLED_STRATEGY_REJECTED', disabledRejected);

    check('DISABLED_STRATEGY_NOT_EXECUTED', versionOneCounter.value === 1);

    const afterDisabledSignalCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check(
      'DISABLED_STRATEGY_DOES_NOT_PERSIST_SIGNAL',
      afterDisabledSignalCount === 1,
    );

    const locksAfterDisabled = await prisma.persistentLock.count({
      where: {
        key: {
          contains: strategyId,
        },
      },
    });

    check(
      'DISABLED_STRATEGY_DOES_NOT_LEAVE_SIGNAL_LOCKS',
      locksAfterDisabled === 0,
    );

    /*
     * ESCENARIO 3:
     * Reiniciar conceptualmente el acceso al estado mediante una
     * nueva instancia de servicio debe recuperar la desactivaciÃ³n.
     */
    const secondActivationRepository = new PrismaStrategyActivationRepository(
      prisma,
    );

    const secondActivationService = new StrategyActivationService(
      secondActivationRepository,
    );

    const secondRunner = new StrategyRunnerService(
      validation,
      persistence,
      lockService,
      secondActivationService,
    );

    let recoveredDisabledRejected = false;

    try {
      await secondRunner.evaluate(versionOne, {
        symbol: 'NVDA',
        evaluatedAt: new Date('2026-08-14T04:02:00.000Z'),
      });
    } catch (error: unknown) {
      recoveredDisabledRejected =
        error instanceof Error &&
        error.message.includes('Strategy is disabled');
    }

    check(
      'DISABLED_STATE_SURVIVES_NEW_SERVICE_INSTANCE',
      recoveredDisabledRejected,
    );

    check(
      'RECOVERED_DISABLED_STATE_PREVENTS_EXECUTION',
      versionOneCounter.value === 1,
    );

    /*
     * ESCENARIO 4:
     * Otra versiÃ³n de la misma estrategia debe tener estado propio.
     */
    const versionTwoResult = await runner.evaluate(versionTwo, {
      symbol: 'TSLA',
      evaluatedAt: new Date('2026-08-14T04:03:00.000Z'),
    });

    check(
      'DIFFERENT_VERSION_REMAINS_ENABLED',
      versionTwoResult.strategyVersion === '2.0.0',
    );

    check('DIFFERENT_VERSION_EXECUTED', versionTwoCounter.value === 1);

    const versionTwoState = await prisma.strategyActivationState.findUnique({
      where: {
        strategyId_strategyVersion: {
          strategyId,
          strategyVersion: '2.0.0',
        },
      },
    });

    check(
      'DIFFERENT_VERSION_HAS_INDEPENDENT_STATE',
      versionTwoState?.enabled === true && versionTwoState.version === 0,
    );

    /*
     * ESCENARIO 5:
     * Reactivar la versiÃ³n 1 debe permitir nuevamente la ejecuciÃ³n.
     */
    const activated = await activationService.activate({
      strategyId,
      strategyVersion: '1.0.0',
    });

    check('STRATEGY_REACTIVATED', activated.enabled === true);

    check('REACTIVATION_VERSION_INCREMENTED', activated.version === 2);

    const reactivatedResult = await runner.evaluate(versionOne, {
      symbol: 'MSFT',
      evaluatedAt: new Date('2026-08-14T04:04:00.000Z'),
    });

    check('REACTIVATED_STRATEGY_ACCEPTED', reactivatedResult.symbol === 'MSFT');

    check('REACTIVATED_STRATEGY_EXECUTED', versionOneCounter.value === 2);

    const finalVersionOneSignalCount = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion: '1.0.0',
      },
    });

    check('REACTIVATED_SIGNAL_PERSISTED', finalVersionOneSignalCount === 2);

    /*
     * ESCENARIO 6:
     * VerificaciÃ³n fÃ­sica final del estado en PostgreSQL.
     */
    const finalVersionOneState =
      await prisma.strategyActivationState.findUnique({
        where: {
          strategyId_strategyVersion: {
            strategyId,
            strategyVersion: '1.0.0',
          },
        },
      });

    check(
      'FINAL_VERSION_ONE_STATE_CORRECT',
      finalVersionOneState?.enabled === true &&
        finalVersionOneState.version === 2,
    );

    const finalVersionTwoState =
      await prisma.strategyActivationState.findUnique({
        where: {
          strategyId_strategyVersion: {
            strategyId,
            strategyVersion: '2.0.0',
          },
        },
      });

    check(
      'FINAL_VERSION_TWO_STATE_CORRECT',
      finalVersionTwoState?.enabled === true &&
        finalVersionTwoState.version === 0,
    );

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        key: {
          contains: strategyId,
        },
      },
    });

    check('NO_TEST_SIGNAL_LOCKS_REMAIN', remainingLocks === 0);

    console.log('PUNTO 261 PASO 4 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
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
          contains: strategyId,
        },
      },
    });

    const remainingSignals = await prisma.strategySignalRecord.count({
      where: {
        strategyId,
      },
    });

    const remainingStates = await prisma.strategyActivationState.count({
      where: {
        strategyId,
      },
    });

    const remainingLocks = await prisma.persistentLock.count({
      where: {
        key: {
          contains: strategyId,
        },
      },
    });

    check('TEST_SIGNAL_RECORDS_CLEANED_UP', remainingSignals === 0);

    check('TEST_ACTIVATION_RECORDS_CLEANED_UP', remainingStates === 0);

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

