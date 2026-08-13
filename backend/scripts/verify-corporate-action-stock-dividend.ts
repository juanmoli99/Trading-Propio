import { CorporateActionStockDividendService } from '../src/corporate-actions/corporate-action-stock-dividend.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: Record<string, any> = {};

  const processDate = new Date('2026-06-10T00:00:00.000Z');

  const corporateActionsService = {
    async getAllCorporateActions(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        items: [
          {
            id: 'stock-dividend-1',
            type: 'stock_dividend',
            symbol: 'AAPL',
            processDate,
            raw: {
              rate: '0.25',
              ex_date: '2026-06-08',
              record_date: '2026-06-09',
              payable_date: '2026-06-10',
            },
          },
          {
            id: 'cash-dividend-ignored',
            type: 'cash_dividend',
            symbol: 'AAPL',
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

  const service = new CorporateActionStockDividendService(
    corporateActionsService,
  );

  const result = await service.getStockDividends({
    symbol: ' aapl ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const dividend = result.dividends[0];

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    QUERY_SCOPED_TO_STOCK_DIVIDENDS:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] === 'stock_dividend',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',

    DATE_FILTERS_PRESERVED:
      capturedQuery?.start === '2026-01-01' &&
      capturedQuery?.end === '2026-12-31',

    SORT_ASC_USED:
      capturedQuery?.sort === 'asc',

    ONLY_STOCK_DIVIDENDS_INCLUDED:
      result.dividends.length === 1 &&
      dividend?.id === 'stock-dividend-1',

    RATE_NORMALIZED:
      dividend?.rate === 0.25,

    PROCESS_DATE_PRESERVED:
      dividend?.processDate.toISOString() ===
      '2026-06-10T00:00:00.000Z',

    EX_DATE_PRESERVED:
      dividend?.exDate?.toISOString() ===
      '2026-06-08T00:00:00.000Z',

    RECORD_DATE_PRESERVED:
      dividend?.recordDate?.toISOString() ===
      '2026-06-09T00:00:00.000Z',

    PAYABLE_DATE_PRESERVED:
      dividend?.payableDate?.toISOString() ===
      '2026-06-10T00:00:00.000Z',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      dividend?.processDate !== processDate,
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
      service.getStockDividends({
        symbol: '   ',
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionStockDividendService => {
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

    return new CorporateActionStockDividendService(
      dependency,
    );
  };

  const baseItem = {
    id: 'invalid-test',
    type: 'stock_dividend',
    symbol: 'AAPL',
    processDate: new Date(
      '2026-06-10T00:00:00.000Z',
    ),
    raw: {
      rate: '0.25',
    },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'ZERO_RATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: { rate: 0 },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'NEGATIVE_RATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: { rate: -0.25 },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'INVALID_RATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: { rate: 'invalid' },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'INVALID_EX_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          rate: '0.25',
          ex_date: 'invalid',
        },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'INVALID_RECORD_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          rate: '0.25',
          record_date: 'invalid',
        },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  await expectRejected(
    'INVALID_PAYABLE_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          rate: '0.25',
          payable_date: 'invalid',
        },
      }).getStockDividends({
        symbol: 'AAPL',
      }),
  );

  const defensiveResult =
    await service.getStockDividends({
      symbol: 'AAPL',
    });

  const originalExDate =
    defensiveResult.dividends[0]?.exDate;

  if (originalExDate !== null && originalExDate !== undefined) {
    const originalTime = originalExDate.getTime();

    originalExDate.setUTCFullYear(2000);

    const secondResult =
      await service.getStockDividends({
        symbol: 'AAPL',
      });

    checks.OPTIONAL_DATE_DEFENSIVELY_COPIED =
      secondResult.dividends[0]?.exDate?.getTime() ===
      originalTime;
  } else {
    checks.OPTIONAL_DATE_DEFENSIVELY_COPIED = false;
  }

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 172 FALLÃ“: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 172 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 172 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });