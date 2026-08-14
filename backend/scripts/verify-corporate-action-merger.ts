import { CorporateActionMergerService } from '../src/corporate-actions/corporate-action-merger.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: Record<string, unknown> = {};

  const processDate = new Date('2026-08-01T00:00:00.000Z');

  const corporateActionsService = {
    async getAllCorporateActions(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        items: [
          {
            id: 'cash-merger-1',
            type: 'cash_merger',
            symbol: 'ABC',
            processDate,
            raw: {
              symbol: 'ABC',
              process_date: '2026-08-01',
              cash: '42.50',
            },
          },
          {
            id: 'stock-merger-1',
            type: 'stock_merger',
            symbol: 'XYZ',
            processDate,
            raw: {
              symbol: 'XYZ',
              process_date: '2026-08-01',
              target_symbol: 'NEW',
              rate: '1.5',
            },
          },
          {
            id: 'mixed-merger-1',
            type: 'stock_and_cash_merger',
            symbol: 'MIX',
            processDate,
            raw: {
              symbol: 'MIX',
              process_date: '2026-08-01',
              target_symbol: 'NEW',
              rate: '0.75',
              cash: '10.00',
            },
          },
          {
            id: 'ignored-dividend',
            type: 'cash_dividend',
            symbol: 'ABC',
            processDate,
            raw: {
              rate: '1.00',
            },
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  } as unknown as CorporateActionsService;

  const service = new CorporateActionMergerService(
    corporateActionsService,
  );

  const result = await service.getMergers({
    symbol: ' abc ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const merger = result.mergers[0];

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'ABC',

    QUERY_SCOPED_TO_ALL_MERGER_TYPES:
      Array.isArray(capturedQuery.types) &&
      capturedQuery.types.length === 3 &&
      capturedQuery.types.includes('cash_merger') &&
      capturedQuery.types.includes('stock_merger') &&
      capturedQuery.types.includes(
        'stock_and_cash_merger',
      ),

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'ABC',

    DATE_FILTERS_PRESERVED:
      capturedQuery.start === '2026-01-01' &&
      capturedQuery.end === '2026-12-31',

    SORT_ASC_USED:
      capturedQuery.sort === 'asc',

    ONLY_MERGERS_INCLUDED:
      result.mergers.length === 3,

    CASH_MERGER_INCLUDED:
      result.mergers.some(
        (item) => item.type === 'cash_merger',
      ),

    STOCK_MERGER_INCLUDED:
      result.mergers.some(
        (item) => item.type === 'stock_merger',
      ),

    STOCK_AND_CASH_MERGER_INCLUDED:
      result.mergers.some(
        (item) =>
          item.type === 'stock_and_cash_merger',
      ),

    ID_PRESERVED:
      merger?.id === 'cash-merger-1',

    TYPE_PRESERVED:
      merger?.type === 'cash_merger',

    MERGER_SYMBOL_NORMALIZED:
      merger?.symbol === 'ABC',

    PROCESS_DATE_PRESERVED:
      merger?.processDate.toISOString() ===
      '2026-08-01T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      merger?.raw.cash === '42.50',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      merger?.processDate !== processDate,

    RAW_PAYLOAD_DEFENSIVELY_COPIED:
      merger?.raw !== undefined &&
      typeof merger.raw === 'object',
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
    'INVALID_SYMBOL_REJECTED',
    () =>
      service.getMergers({
        symbol: '   ',
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionMergerService => {
    const dependency = {
      async getAllCorporateActions() {
        return {
          items: [item],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    } as unknown as CorporateActionsService;

    return new CorporateActionMergerService(
      dependency,
    );
  };

  const baseItem = {
    id: 'invalid-test',
    type: 'cash_merger',
    symbol: 'ABC',
    processDate: new Date(
      '2026-08-01T00:00:00.000Z',
    ),
    raw: {
      cash: '10.00',
    },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getMergers({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getMergers({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        id: '   ',
      }).getMergers({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'INVALID_RAW_PAYLOAD_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: null,
      }).getMergers({
        symbol: 'ABC',
      }),
  );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 174 FALLÃƒâ€œ: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 174 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 174 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
