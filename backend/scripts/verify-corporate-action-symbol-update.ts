import { CorporateActionSymbolUpdateService } from '../src/corporate-actions/corporate-action-symbol-update.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';
import type { PrismaService } from '../src/database/prisma.service';

async function main(): Promise<void> {
  let capturedQuery: any = null;
  const updates: Array<{ oldSymbol: string; newSymbol: string }> = [];

  const effectiveService = {
    async getEffectiveActions(query: Record<string, unknown>) {
      capturedQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        effective: [
          {
            id: 'rename-1',
            type: 'name_change',
            symbol: 'OLD',
            processDate: new Date('2026-08-10T00:00:00.000Z'),
            raw: {
              old_symbol: ' old ',
              new_symbol: ' new ',
            },
          },
          {
            id: 'name-only',
            type: 'name_change',
            symbol: 'SAME',
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            raw: {
              old_symbol: 'same',
              new_symbol: 'SAME',
              old_name: 'Old Name',
              new_name: 'New Name',
            },
          },
          {
            id: 'rename-no-reference',
            type: 'name_change',
            symbol: 'AAA',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            raw: {
              old_symbol: 'AAA',
              new_symbol: 'BBB',
            },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const prisma = {
    async $transaction(callback: (tx: any) => Promise<unknown>) {
      return callback({
        platformAlpacaOrder: {
          async updateMany(args: any) {
            const oldSymbol = args.where.symbol;
            const newSymbol = args.data.symbol;

            updates.push({ oldSymbol, newSymbol });

            return {
              count: oldSymbol === 'OLD' ? 2 : 0,
            };
          },
        },
      });
    },
  } as unknown as PrismaService;

  const service = new CorporateActionSymbolUpdateService(
    prisma,
    effectiveService,
  );

  const result = await service.updateLocalSymbols({
    symbols: ['OLD'],
    asOf: new Date('2026-08-13T15:00:00.000Z'),
    start: '2026-01-01',
  });

  const updated = result.items.find(
    (item) => item.corporateActionId === 'rename-1',
  );

  const nameOnly = result.items.find(
    (item) => item.corporateActionId === 'name-only',
  );

  const noReference = result.items.find(
    (item) => item.corporateActionId === 'rename-no-reference',
  );

  const checks: Record<string, boolean> = {
    QUERY_SCOPED_TO_NAME_CHANGES:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] === 'name_change',

    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols[0] === 'OLD',

    QUERY_START_PRESERVED:
      capturedQuery?.start === '2026-01-01',

    QUERY_AS_OF_PRESERVED:
      capturedQuery?.asOf instanceof Date,

    THREE_RESULTS_CREATED:
      result.items.length === 3,

    OLD_SYMBOL_NORMALIZED:
      updated?.oldSymbol === 'OLD',

    NEW_SYMBOL_NORMALIZED:
      updated?.newSymbol === 'NEW',

    LOCAL_REFERENCES_UPDATED:
      updates.some(
        (item) =>
          item.oldSymbol === 'OLD' &&
          item.newSymbol === 'NEW',
      ),

    UPDATED_STATUS_CORRECT:
      updated?.status === 'UPDATED',

    UPDATED_ORDER_COUNT_CORRECT:
      updated?.updatedPlatformOrderCount === 2,

    NAME_ONLY_DETECTED:
      nameOnly?.status === 'NAME_ONLY' &&
      nameOnly.updatedPlatformOrderCount === 0,

    NO_REFERENCE_DETECTED:
      noReference?.status === 'NO_LOCAL_REFERENCES',

    UPDATED_EVENT_COUNT_CORRECT:
      result.updatedEventCount === 1,

    NO_REFERENCE_COUNT_CORRECT:
      result.noLocalReferencesCount === 1,

    NAME_ONLY_COUNT_CORRECT:
      result.nameOnlyCount === 1,

    TOTAL_UPDATED_ORDER_COUNT_CORRECT:
      result.updatedPlatformOrderCount === 2,

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      updated?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',
  };

  const expectRejected = async (
    name: string,
    raw: Record<string, unknown>,
  ): Promise<void> => {
    const badEffective = {
      async getEffectiveActions() {
        return {
          asOf: new Date('2026-08-13T00:00:00.000Z'),
          effective: [
            {
              id: 'invalid',
              type: 'name_change',
              symbol: 'OLD',
              processDate: new Date('2026-08-13T00:00:00.000Z'),
              raw,
            },
          ],
        };
      },
    } as unknown as CorporateActionEffectiveService;

    const badService = new CorporateActionSymbolUpdateService(
      prisma,
      badEffective,
    );

    try {
      await badService.updateLocalSymbols();
      checks[name] = false;
    } catch {
      checks[name] = true;
    }
  };

  await expectRejected(
    'MISSING_OLD_SYMBOL_REJECTED',
    { new_symbol: 'NEW' },
  );

  await expectRejected(
    'MISSING_NEW_SYMBOL_REJECTED',
    { old_symbol: 'OLD' },
  );

  await expectRejected(
    'INVALID_OLD_SYMBOL_REJECTED',
    {
      old_symbol: 'BAD SYMBOL',
      new_symbol: 'NEW',
    },
  );

  await expectRejected(
    'INVALID_NEW_SYMBOL_REJECTED',
    {
      old_symbol: 'OLD',
      new_symbol: 'BAD SYMBOL',
    },
  );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 184 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log('PUNTO 184 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 184 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });