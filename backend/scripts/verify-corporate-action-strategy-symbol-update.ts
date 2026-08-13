import { CorporateActionStrategySymbolUpdateService } from '../src/corporate-actions/corporate-action-strategy-symbol-update.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';
import type { PrismaService } from '../src/database/prisma.service';

interface Association {
  id: string;
  strategyId: string;
  symbol: string;
}

async function main(): Promise<void> {
  const associations: Association[] = [
    {
      id: 'a1',
      strategyId: 'strategy-1',
      symbol: 'OLD',
    },
    {
      id: 'a2',
      strategyId: 'strategy-2',
      symbol: 'OLD',
    },
    {
      id: 'a3',
      strategyId: 'strategy-2',
      symbol: 'NEW',
    },
    {
      id: 'a4',
      strategyId: 'strategy-3',
      symbol: 'DUPOLD',
    },
    {
      id: 'a5',
      strategyId: 'strategy-3',
      symbol: 'DUPNEW',
    },
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
            id: 'mixed-update',
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
            id: 'duplicate-only',
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
            id: 'not-associated',
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
    strategySymbolAssociation: {
      async findMany(args: any) {
        return associations
          .filter(
            (item) =>
              item.symbol === args.where.symbol,
          )
          .map((item) => ({
            id: item.id,
            strategyId: item.strategyId,
          }));
      },

      async findUnique(args: any) {
        const key = args.where.strategyId_symbol;

        const item =
          associations.find(
            (association) =>
              association.strategyId ===
                key.strategyId &&
              association.symbol === key.symbol,
          ) ?? null;

        return item === null
          ? null
          : { id: item.id };
      },

      async update(args: any) {
        const item = associations.find(
          (association) =>
            association.id === args.where.id,
        );

        if (!item) {
          throw new Error(
            'Mock association not found for update',
          );
        }

        item.symbol = args.data.symbol;

        return { ...item };
      },

      async delete(args: any) {
        const index = associations.findIndex(
          (association) =>
            association.id === args.where.id,
        );

        if (index < 0) {
          throw new Error(
            'Mock association not found for delete',
          );
        }

        const [removed] = associations.splice(
          index,
          1,
        );

        return removed;
      },
    },
  };

  const prisma = {
    async $transaction(
      callback: (transaction: any) => Promise<unknown>,
    ) {
      transactionCount += 1;
      return callback(transactionClient);
    },
  } as unknown as PrismaService;

  const service =
    new CorporateActionStrategySymbolUpdateService(
      prisma,
      effectiveService,
    );

  const asOf = new Date(
    '2026-08-13T15:30:00.000Z',
  );

  const result =
    await service.updateStrategySymbols({
      symbols: ['OLD'],
      asOf,
      start: '2026-01-01',
    });

  const mixed = result.items.find(
    (item) =>
      item.corporateActionId === 'mixed-update',
  );

  const duplicateOnly = result.items.find(
    (item) =>
      item.corporateActionId ===
      'duplicate-only',
  );

  const notAssociated = result.items.find(
    (item) =>
      item.corporateActionId ===
      'not-associated',
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
      mixed?.oldSymbol === 'OLD' &&
      mixed?.newSymbol === 'NEW',

    STRATEGY_1_UPDATED:
      associations.some(
        (item) =>
          item.strategyId === 'strategy-1' &&
          item.symbol === 'NEW',
      ),

    STRATEGY_2_DUPLICATE_REMOVED:
      associations.filter(
        (item) =>
          item.strategyId === 'strategy-2' &&
          item.symbol === 'NEW',
      ).length === 1 &&
      !associations.some(
        (item) =>
          item.strategyId === 'strategy-2' &&
          item.symbol === 'OLD',
      ),

    MIXED_EVENT_STATUS_UPDATED:
      mixed?.status === 'UPDATED',

    MIXED_UPDATED_COUNT_CORRECT:
      mixed?.updatedAssociationCount === 1,

    MIXED_DUPLICATE_COUNT_CORRECT:
      mixed?.removedDuplicateCount === 1,

    DUPLICATE_ONLY_OLD_REMOVED:
      !associations.some(
        (item) =>
          item.strategyId === 'strategy-3' &&
          item.symbol === 'DUPOLD',
      ),

    DUPLICATE_ONLY_NEW_PRESERVED:
      associations.filter(
        (item) =>
          item.strategyId === 'strategy-3' &&
          item.symbol === 'DUPNEW',
      ).length === 1,

    DUPLICATE_ONLY_STATUS_CORRECT:
      duplicateOnly?.status ===
      'REMOVED_OBSOLETE_DUPLICATE',

    NOT_ASSOCIATED_STATUS_CORRECT:
      notAssociated?.status ===
      'NOT_ASSOCIATED',

    NOT_ASSOCIATED_DID_NOT_CREATE:
      !associations.some(
        (item) =>
          item.symbol === 'REPLACEMENT',
      ),

    NAME_ONLY_STATUS_CORRECT:
      nameOnly?.status === 'NAME_ONLY',

    UPDATED_EVENT_COUNT_CORRECT:
      result.updatedEventCount === 1,

    DUPLICATE_EVENT_COUNT_CORRECT:
      result.removedObsoleteDuplicateEventCount ===
      1,

    NOT_ASSOCIATED_COUNT_CORRECT:
      result.notAssociatedCount === 1,

    NAME_ONLY_COUNT_CORRECT:
      result.nameOnlyCount === 1,

    TOTAL_UPDATED_ASSOCIATION_COUNT_CORRECT:
      result.updatedAssociationCount === 1,

    TOTAL_REMOVED_DUPLICATE_COUNT_CORRECT:
      result.removedDuplicateCount === 2,

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      mixed?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',
  };

  const createInvalidService = (
    raw: Record<string, unknown>,
    id = 'invalid',
    processDate = new Date(
      '2026-08-13T00:00:00.000Z',
    ),
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
              processDate,
              raw,
            },
          ],
        };
      },
    } as unknown as CorporateActionEffectiveService;

    return new CorporateActionStrategySymbolUpdateService(
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
      ).updateStrategySymbols(),
  );

  await expectRejected(
    'MISSING_OLD_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        new_symbol: 'NEW',
      }).updateStrategySymbols(),
  );

  await expectRejected(
    'MISSING_NEW_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'OLD',
      }).updateStrategySymbols(),
  );

  await expectRejected(
    'INVALID_OLD_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'BAD SYMBOL',
        new_symbol: 'NEW',
      }).updateStrategySymbols(),
  );

  await expectRejected(
    'INVALID_NEW_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        old_symbol: 'OLD',
        new_symbol: 'BAD SYMBOL',
      }).updateStrategySymbols(),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      createInvalidService(
        {
          old_symbol: 'OLD',
          new_symbol: 'NEW',
        },
        'bad-date',
        new Date(Number.NaN),
      ).updateStrategySymbols(),
  );

  const snapshot = associations.map(
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
            id: 'mixed-update',
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
    new CorporateActionStrategySymbolUpdateService(
      prisma,
      idempotentEffective,
    );

  const secondRun =
    await idempotentService.updateStrategySymbols();

  checks.SECOND_RUN_IS_IDEMPOTENT =
    secondRun.items.length === 1 &&
    secondRun.items[0]?.status ===
      'NOT_ASSOCIATED' &&
    secondRun.updatedAssociationCount === 0 &&
    secondRun.removedDuplicateCount === 0 &&
    JSON.stringify(associations) ===
      JSON.stringify(snapshot);

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 186 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 186 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 186 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });