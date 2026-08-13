import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolSuspensionFilterService } from '../src/watchlist/symbol-suspension-filter.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 207 verification');
  }

  const configService = {
    get<T>(key: string): T | undefined {
      if (key === 'database.url') {
        return databaseUrl as T;
      }

      return undefined;
    },
  } as unknown as ConfigService;

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const service = new SymbolSuspensionFilterService(prisma);

  const suffix = `${Date.now()}`;

  const activeSymbol = `P207A${suffix.slice(-7)}`;

  const inactiveSymbol = `P207I${suffix.slice(-7)}`;

  const suspendedSymbol = `P207S${suffix.slice(-7)}`;

  const haltedSymbol = `P207H${suffix.slice(-7)}`;

  const unknownStatusSymbol = `P207U${suffix.slice(-7)}`;

  const nullStatusSymbol = `P207N${suffix.slice(-7)}`;

  const missingSymbol = `P207M${suffix.slice(-7)}`;

  const createdIds: string[] = [];

  try {
    for (const item of [
      {
        symbol: activeSymbol,
        alpacaStatus: 'active',
      },
      {
        symbol: inactiveSymbol,
        alpacaStatus: 'inactive',
      },
      {
        symbol: suspendedSymbol,
        alpacaStatus: 'suspended',
      },
      {
        symbol: haltedSymbol,
        alpacaStatus: 'halted',
      },
      {
        symbol: unknownStatusSymbol,
        alpacaStatus: 'maintenance',
      },
      {
        symbol: nullStatusSymbol,
        alpacaStatus: null,
      },
    ]) {
      const created = await prisma.tradingSymbol.create({
        data: item,
      });

      createdIds.push(created.id);
    }

    const active = await service.evaluate(`  ${activeSymbol.toLowerCase()}  `);

    check('SYMBOL_NORMALIZED', active.symbol === activeSymbol);

    check('ACTIVE_SYMBOL_ALLOWED', active.allowed === true);

    check('ACTIVE_STATUS_CORRECT', active.status === 'ALLOWED');

    check('ACTIVE_ALPACA_STATUS_PRESERVED', active.alpacaStatus === 'active');

    check('ACTIVE_REASON_PRESENT', active.reason.length > 0);

    await service.assertAllowed(activeSymbol);

    check('ASSERT_ALLOWED_PASSES_ACTIVE', true);

    const inactive = await service.evaluate(inactiveSymbol);

    check('INACTIVE_SYMBOL_BLOCKED', inactive.allowed === false);

    check('INACTIVE_STATUS_CORRECT', inactive.status === 'INACTIVE');

    check(
      'INACTIVE_ALPACA_STATUS_PRESERVED',
      inactive.alpacaStatus === 'inactive',
    );

    let inactiveRejected = false;

    try {
      await service.assertAllowed(inactiveSymbol);
    } catch {
      inactiveRejected = true;
    }

    check('ASSERT_ALLOWED_REJECTS_INACTIVE', inactiveRejected);

    const suspended = await service.evaluate(suspendedSymbol);

    check('SUSPENDED_SYMBOL_BLOCKED', suspended.allowed === false);

    check('SUSPENDED_STATUS_CORRECT', suspended.status === 'SUSPENDED');

    check(
      'SUSPENDED_ALPACA_STATUS_PRESERVED',
      suspended.alpacaStatus === 'suspended',
    );

    const halted = await service.evaluate(haltedSymbol);

    check('HALTED_SYMBOL_BLOCKED', halted.allowed === false);

    check('HALTED_CLASSIFIED_AS_SUSPENDED', halted.status === 'SUSPENDED');

    check('HALTED_ALPACA_STATUS_PRESERVED', halted.alpacaStatus === 'halted');

    const unknown = await service.evaluate(unknownStatusSymbol);

    check('UNKNOWN_STATUS_BLOCKED', unknown.allowed === false);

    check(
      'UNKNOWN_STATUS_CLASSIFICATION_CORRECT',
      unknown.status === 'UNKNOWN_ASSET_STATUS',
    );

    check(
      'UNKNOWN_ALPACA_STATUS_PRESERVED',
      unknown.alpacaStatus === 'maintenance',
    );

    const nullStatus = await service.evaluate(nullStatusSymbol);

    check('NULL_STATUS_BLOCKED', nullStatus.allowed === false);

    check(
      'NULL_STATUS_CLASSIFICATION_CORRECT',
      nullStatus.status === 'UNKNOWN_ASSET_STATUS',
    );

    check('NULL_STATUS_PRESERVED', nullStatus.alpacaStatus === null);

    check('NULL_STATUS_FAIL_SAFE', !nullStatus.allowed);

    const missing = await service.evaluate(missingSymbol);

    check('MISSING_SYMBOL_BLOCKED', missing.allowed === false);

    check(
      'MISSING_SYMBOL_STATUS_CORRECT',
      missing.status === 'SYMBOL_NOT_FOUND',
    );

    check('MISSING_SYMBOL_ALPACA_STATUS_NULL', missing.alpacaStatus === null);

    check('MISSING_SYMBOL_FAIL_SAFE', !missing.allowed);

    let missingRejected = false;

    try {
      await service.assertAllowed(missingSymbol);
    } catch {
      missingRejected = true;
    }

    check('ASSERT_ALLOWED_REJECTS_MISSING_SYMBOL', missingRejected);

    for (const invalidSymbol of ['', '   ', 'A'.repeat(33)]) {
      let rejected = false;

      try {
        await service.evaluate(invalidSymbol);
      } catch {
        rejected = true;
      }

      check(
        `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalidSymbol)}`,
        rejected,
      );
    }

    const repeated = await service.evaluate(activeSymbol);

    check(
      'REPEATED_EVALUATION_DETERMINISTIC',
      repeated.symbol === active.symbol &&
        repeated.alpacaStatus === active.alpacaStatus &&
        repeated.allowed === active.allowed &&
        repeated.status === active.status &&
        repeated.reason === active.reason,
    );

    console.log('PUNTO 207 VERIFICADO CORRECTAMENTE.');
  } finally {
    if (createdIds.length > 0) {
      await prisma.tradingSymbol.deleteMany({
        where: {
          id: {
            in: createdIds,
          },
        },
      });
    }

    const remaining = await prisma.tradingSymbol.count({
      where: {
        id: {
          in: createdIds,
        },
      },
    });

    check('VERIFICATION_DATA_CLEANED', remaining === 0);

    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
