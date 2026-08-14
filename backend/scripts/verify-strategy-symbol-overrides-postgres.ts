import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaStrategySymbolOverrideRepository } from '../src/strategies/prisma-strategy-symbol-override.repository';
import { StrategySymbolOverrideService } from '../src/strategies/strategy-symbol-override.service';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
  expectedMessage: string,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch (error: unknown) {
    rejected =
      error instanceof Error && error.message.includes(expectedMessage);
  }

  check(name, rejected);
}

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

  const validation = new StrategyValidationService();

  const repository = new PrismaStrategySymbolOverrideRepository(
    prisma,
    validation,
  );

  const service = new StrategySymbolOverrideService(validation, repository);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);

  const strategyId = `override-${suffix}`;
  const strategyVersion = '1.0.0';
  const secondVersion = '2.0.0';

  const identity = {
    strategyId,
    strategyVersion,
    symbol: ' aapl ',
  };

  try {
    const initial = await service.get(identity);

    check('MISSING_OVERRIDE_RETURNS_NULL', initial === null);

    const created = await service.set({
      ...identity,
      parameters: {
        threshold: 0.8,
        period: 20,
        nested: {
          fast: 10,
          slow: 30,
        },
      },
    });

    check(
      'OVERRIDE_CREATED',
      created.strategyId === strategyId &&
        created.strategyVersion === strategyVersion &&
        created.symbol === 'AAPL',
    );

    check('INITIAL_VERSION_ZERO', created.version === 0);

    const physical = await prisma.strategySymbolOverrideState.findUnique({
      where: {
        strategyId_strategyVersion_symbol: {
          strategyId,
          strategyVersion,
          symbol: 'AAPL',
        },
      },
    });

    check('OVERRIDE_PHYSICALLY_PERSISTED', physical !== null);

    check('PHYSICAL_VERSION_ZERO', physical?.version === 0);

    const recovered = await service.get({
      strategyId,
      strategyVersion,
      symbol: 'AAPL',
    });

    check('OVERRIDE_RECOVERABLE', recovered !== null);

    if (recovered === null) {
      throw new Error('Persisted override unexpectedly missing');
    }

    check(
      'RECOVERED_PARAMETERS_CORRECT',
      recovered.parameters.threshold === 0.8 &&
        recovered.parameters.period === 20,
    );

    const recoveredNested = recovered.parameters.nested;

    if (!isPlainRecord(recoveredNested)) {
      throw new Error('Recovered nested parameters are invalid');
    }

    check(
      'RECOVERED_NESTED_PARAMETERS_CORRECT',
      recoveredNested.fast === 10 && recoveredNested.slow === 30,
    );

    const updated = await service.set({
      strategyId,
      strategyVersion,
      symbol: 'AAPL',
      parameters: {
        threshold: 0.9,
        nested: {
          fast: 12,
        },
      },
    });

    check('OVERRIDE_UPDATED', updated.parameters.threshold === 0.9);

    check('UPDATE_INCREMENTS_VERSION', updated.version === 1);

    const updatedPhysical =
      await prisma.strategySymbolOverrideState.findUniqueOrThrow({
        where: {
          strategyId_strategyVersion_symbol: {
            strategyId,
            strategyVersion,
            symbol: 'AAPL',
          },
        },
      });

    check(
      'UPDATED_PARAMETERS_PHYSICALLY_PERSISTED',
      updatedPhysical.version === 1,
    );

    const baseParameters = {
      threshold: 0.5,
      period: 50,
      enabled: true,
      nested: {
        fast: 5,
        slow: 25,
      },
    };

    const resolved = await service.resolveForSymbol(
      {
        strategyId,
        strategyVersion,
        symbol: 'AAPL',
      },
      baseParameters,
    );

    check('OVERRIDE_APPLIED_TO_BASE', resolved.threshold === 0.9);

    check(
      'UNOVERRIDDEN_BASE_VALUE_PRESERVED',
      resolved.period === 50 && resolved.enabled === true,
    );

    const resolvedNested = resolved.nested;

    if (!isPlainRecord(resolvedNested)) {
      throw new Error('Resolved nested parameters are invalid');
    }

    check('NESTED_OVERRIDE_APPLIED_TO_BASE', resolvedNested.fast === 12);

    check('NESTED_BASE_VALUE_PRESERVED', resolvedNested.slow === 25);

    const secondSymbol = await service.set({
      strategyId,
      strategyVersion,
      symbol: 'MSFT',
      parameters: {
        threshold: 0.7,
      },
    });

    check(
      'DIFFERENT_SYMBOL_HAS_INDEPENDENT_OVERRIDE',
      secondSymbol.symbol === 'MSFT' &&
        secondSymbol.parameters.threshold === 0.7,
    );

    const secondVersionOverride = await service.set({
      strategyId,
      strategyVersion: secondVersion,
      symbol: 'AAPL',
      parameters: {
        threshold: 0.6,
      },
    });

    check(
      'DIFFERENT_VERSION_HAS_INDEPENDENT_OVERRIDE',
      secondVersionOverride.strategyVersion === secondVersion &&
        secondVersionOverride.parameters.threshold === 0.6,
    );

    const independentCount = await prisma.strategySymbolOverrideState.count({
      where: {
        strategyId,
      },
    });

    check('THREE_INDEPENDENT_OVERRIDE_RECORDS_EXIST', independentCount === 3);

    const staleVersion = updated.version;

    const fresh = await repository.upsert(
      {
        strategyId,
        strategyVersion,
        symbol: 'AAPL',
        parameters: {
          threshold: 0.95,
        },
      },
      staleVersion,
    );

    check('DIRECT_UPDATE_INCREMENTS_VERSION', fresh.version === 2);

    await expectReject(
      'STALE_UPDATE_REJECTED_BY_VERSION_CONFLICT',
      () =>
        repository.upsert(
          {
            strategyId,
            strategyVersion,
            symbol: 'AAPL',
            parameters: {
              threshold: 0.99,
            },
          },
          staleVersion,
        ),
      'Strategy symbol override version conflict',
    );

    const afterConflict = await service.get({
      strategyId,
      strategyVersion,
      symbol: 'AAPL',
    });

    check(
      'STALE_UPDATE_DOES_NOT_OVERWRITE_STORAGE',
      afterConflict !== null &&
        afterConflict.version === 2 &&
        afterConflict.parameters.threshold === 0.95,
    );

    if (afterConflict === null) {
      throw new Error('Override unexpectedly missing before delete');
    }

    await repository.delete(
      {
        strategyId,
        strategyVersion,
        symbol: 'AAPL',
      },
      afterConflict.version,
    );

    const afterDelete = await service.get({
      strategyId,
      strategyVersion,
      symbol: 'AAPL',
    });

    check('OVERRIDE_DELETE_PERSISTED', afterDelete === null);

    await service.remove({
      strategyId,
      strategyVersion,
      symbol: 'MSFT',
    });

    const afterServiceDelete = await service.get({
      strategyId,
      strategyVersion,
      symbol: 'MSFT',
    });

    check('SERVICE_REMOVE_DELETES_OVERRIDE', afterServiceDelete === null);

    await service.remove({
      strategyId,
      strategyVersion,
      symbol: 'MSFT',
    });

    check('REPEATED_REMOVE_IS_IDEMPOTENT', true);

    const sourceCreatedAt = secondVersionOverride.createdAt;

    const sourceUpdatedAt = secondVersionOverride.updatedAt;

    sourceCreatedAt.setUTCFullYear(2030);
    sourceUpdatedAt.setUTCFullYear(2030);

    const recoveredAgain = await service.get({
      strategyId,
      strategyVersion: secondVersion,
      symbol: 'AAPL',
    });

    check(
      'RETURNED_DATES_DO_NOT_MUTATE_STORAGE',
      recoveredAgain !== null &&
        recoveredAgain.createdAt.getUTCFullYear() !== 2030 &&
        recoveredAgain.updatedAt.getUTCFullYear() !== 2030,
    );

    console.log('PUNTO 262 PASO 3 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    await prisma.strategySymbolOverrideState.deleteMany({
      where: {
        strategyId,
      },
    });

    const remaining = await prisma.strategySymbolOverrideState.count({
      where: {
        strategyId,
      },
    });

    check('TEST_OVERRIDE_RECORDS_CLEANED_UP', remaining === 0);

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
