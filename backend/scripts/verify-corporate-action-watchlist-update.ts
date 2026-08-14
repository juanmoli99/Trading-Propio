import { CorporateActionWatchlistUpdateService } from '../src/corporate-actions/corporate-action-watchlist-update.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';
import type { PrismaService } from '../src/database/prisma.service';

interface WatchlistRow {
  id: string;
  symbol: string;
}

async function main(): Promise<void> {
  const watchlist: WatchlistRow[] = [
    { id: 'watch-old', symbol: 'OLD' },
    { id: 'watch-dup-old', symbol: 'DUPOLD' },
    { id: 'watch-dup-new', symbol: 'DUPNEW' },
  ];

  let capturedQuery: any = null;
  let transactionCount = 0;

  const effectiveService = {
    async getEffectiveActions(query: Record<string, unknown>) {
      capturedQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        effective: [
          {
            id: 'rename-update',
            type: 'name_change',
            symbol: 'OLD',
            processDate: new Date(
              '2026-08-10T00:00:00.000Z',
            ),
            raw: {
              old_symbol: ' old ',
              new_symbol: ' new ',
            },
          },
          {
            id: 'rename-duplicate',
            type: 'name_change',
            symbol: 'DUPOLD',
            processDate: new Date(
              '2026-08-11T00:00:00.000Z',
            ),
            raw: {
              old_symbol: 'dupold',
              new_symbol: 'dupnew',
            },
          },
          {
            id: 'rename-missing',
            type: 'name_change',
            symbol: 'MISSING',
            processDate: new Date(
              '2026-08-12T00:00:00.000Z',
            ),
            raw: {
              old_symbol: 'missing',
              new_symbol: 'replacement',
            },
          },
          {
            id: 'name-only',
            type: 'name_change',
            symbol: 'SAME',
            processDate: new Date(
              '2026-08-13T00:00:00.000Z',
            ),
            raw: {
              old_symbol: 'same',
              new_symbol: 'SAME',
            },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const transactionClient = {
    watchlistSymbol: {
      async findUnique(args: any) {
        const symbol = args.where.symbol;

        const row =
          watchlist.find(
            (item) => item.symbol === symbol,
          ) ?? null;

        return row === null
          ? null
          : { id: row.id };
      },

      async update(args: any) {
        const row = watchlist.find(
          (item) => item.id === args.where.id,
        );

        if (!row) {
          throw new Error(
            'Mock watchlist row not found for update',
          );
        }

        row.symbol = args.data.symbol;

        return { ...row };
      },

      async delete(args: any) {
        const index = watchlist.findIndex(
          (item) => item.id === args.where.id,
        );

        if (index < 0) {
          throw new Error(
            'Mock watchlist row not found for delete',
          );
        }

        const [removed] = watchlist.splice(index, 1);

        return removed;
      },
    },
  };

  const prisma = {
    async $transaction(
      callback: (tx: any) => Promise<unknown>,
    ) {
      transactionCount += 1;
      return callback(transactionClient);
    },
  } as unknown as PrismaService;

  const service =
    new CorporateActionWatchlistUpdateService(
      prisma,
      effectiveService,
    );

  const asOf = new Date(
    '2026-08-13T15:30:00.000Z',
  );

  const result = await service.updateWatchlist({
    symbols: ['OLD'],
    asOf,
    start: '2026-01-01',
  });

  const updated = result.items.find(
    (item) =>
      item.corporateActionId === 'rename-update',
  );

  const duplicate = result.items.find(
    (item) =>
      item.corporateActionId ===
      'rename-duplicate',
  );

  const missing = result.items.find(
    (item) =>
      item.corporateActionId === 'rename-missing',
  );

  const nameOnly = result.items.find(
    (item) =>
      item.corporateActionId === 'name-only',
  );

  const checks: Record<string, boolean> = {
    QUERY_SCOPED_TO_NAME_CHANGES:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] ===
        'name_change',

    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'OLD',

    QUERY_START_PRESERVED:
      capturedQuery?.start === '2026-01-01',

    QUERY_AS_OF_PRESERVED:
      capturedQuery?.asOf === asOf,

    SINGLE_TRANSACTION_USED:
      transactionCount === 1,

    FOUR_RESULTS_CREATED:
      result.items.length === 4,

    SYMBOLS_NORMALIZED:
      updated?.oldSymbol === 'OLD' &&
      updated?.newSymbol === 'NEW',

    OLD_SYMBOL_UPDATED_TO_NEW:
      watchlist.some(
        (item) =>
          item.id === 'watch-old' &&
          item.symbol === 'NEW',
      ) &&
      !watchlist.some(
        (item) => item.symbol === 'OLD',
      ),

    UPDATED_STATUS_CORRECT:
      updated?.status === 'UPDATED',

    DUPLICATE_OLD_REMOVED:
      !watchlist.some(
        (item) => item.symbol === 'DUPOLD',
      ) &&
      watchlist.filter(
        (item) => item.symbol === 'DUPNEW',
      ).length === 1,

    DUPLICATE_STATUS_CORRECT:
      duplicate?.status ===
      'REMOVED_OBSOLETE_DUPLICATE',

    MISSING_SYMBOL_NOT_CREATED:
      !watchlist.some(
        (item) =>
          item.symbol === 'REPLACEMENT',
      ),

    NOT_IN_WATCHLIST_STATUS_CORRECT:
      missing?.status === 'NOT_IN_WATCHLIST',

    NAME_ONLY_STATUS_CORRECT:
      nameOnly?.status === 'NAME_ONLY',

    UPDATED_COUNT_CORRECT:
      result.updatedCount === 1,

    DUPLICATE_REMOVAL_COUNT_CORRECT:
      result.removedObsoleteDuplicateCount === 1,

    NOT_IN_WATCHLIST_COUNT_CORRECT:
      result.notInWatchlistCount === 1,

    NAME_ONLY_COUNT_CORRECT:
      result.nameOnlyCount === 1,

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      updated?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',
  };

  const createInvalidService = (
    raw: Record<string, unknown>,
    id = 'invalid',
  ) => {
    const invalidEffective = {
      async getEffectiveActions() {
        return {
          asOf: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          effective: [
            {
              id,
              type: 'name_change',
              symbol: 'OLD',
              processDate: new Date(
                '2026-08-13T00:00:00.000Z',
              ),
              raw,
            },
          ],
        };
      },
    } as unknown as CorporateActionEffectiveService;

    return new CorporateActionWatchlistUpdateService(
      prisma,
      invalidEffective,
    );
  };

  const expectRejected = async (
    name: string,
    action: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      await action();
      checks[name] = false;
    } catch {
      checks[name] = true;
    }
  };

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createInvalidService(
        {
          old_symbol: 'OLD',
          new_symbol: 'NEW',
        },
        '   ',
      ).updateWatchlist(),
  );

  await expectRejected(
    'MISSING_OLD_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        new_symbol: 'NEW',
      }).updateWatchlist(),
  );

  await expectRejected(
    'MISSING_NEW_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'OLD',
      }).updateWatchlist(),
  );

  await expectRejected(
    'INVALID_OLD_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'BAD SYMBOL',
        new_symbol: 'NEW',
      }).updateWatchlist(),
  );

  await expectRejected(
    'INVALID_NEW_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'OLD',
        new_symbol: 'BAD SYMBOL',
      }).updateWatchlist(),
  );

  const snapshot = watchlist.map(
    (item) => ({ ...item }),
  );

  const idempotentEffective = {
    async getEffectiveActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        effective: [
          {
            id: 'rename-update',
            type: 'name_change',
            symbol: 'OLD',
            processDate: new Date(
              '2026-08-10T00:00:00.000Z',
            ),
            raw: {
              old_symbol: 'OLD',
              new_symbol: 'NEW',
            },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const idempotentService =
    new CorporateActionWatchlistUpdateService(
      prisma,
      idempotentEffective,
    );

  const secondRun =
    await idempotentService.updateWatchlist();

  checks.SECOND_RUN_IS_IDEMPOTENT =
    secondRun.items.length === 1 &&
    secondRun.items[0]?.status ===
      'NOT_IN_WATCHLIST' &&
    JSON.stringify(watchlist) ===
      JSON.stringify(snapshot);

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 185 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 185 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 185 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
