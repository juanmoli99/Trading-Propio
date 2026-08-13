import { DividendRelevantDatesService } from '../src/corporate-actions/dividend-relevant-dates.service';
import type { CorporateActionCashDividendService } from '../src/corporate-actions/corporate-action-cash-dividend.service';
import type {
  CorporateActionCashDividend,
  CorporateActionCashDividendResult,
} from '../src/corporate-actions/corporate-action-cash-dividend.types';

function assertCondition(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createDividend(
  overrides: Partial<CorporateActionCashDividend> = {},
): CorporateActionCashDividend {
  return {
    id: 'dividend-1',
    symbol: 'AAPL',
    processDate: new Date('2026-08-20T00:00:00.000Z'),
    rate: 0.25,
    currency: 'USD',
    exDate: new Date('2026-08-17T00:00:00.000Z'),
    recordDate: new Date('2026-08-18T00:00:00.000Z'),
    payableDate: new Date('2026-08-20T00:00:00.000Z'),
    ...overrides,
  };
}

async function main(): Promise<void> {
  let receivedQuery: unknown = null;

  const dividends: CorporateActionCashDividend[] = [
    createDividend(),
    createDividend({
      id: 'dividend-2',
      rate: 0.3,
      exDate: new Date('2026-09-17T00:00:00.000Z'),
      recordDate: null,
      payableDate: new Date('2026-09-20T00:00:00.000Z'),
    }),
  ];

  const cashDividendService = {
    async getCashDividends(
      query: unknown,
    ): Promise<CorporateActionCashDividendResult> {
      receivedQuery = query;

      return {
        symbol: 'AAPL',
        dividends,
      };
    },
  } as CorporateActionCashDividendService;

  const service = new DividendRelevantDatesService(cashDividendService);

  const result = await service.getRelevantDates({
    symbol: 'aapl',
    start: '2026-08-01',
    end: '2026-09-30',
  });

  assertCondition(
    'QUERY_FORWARDED',
    JSON.stringify(receivedQuery) ===
      JSON.stringify({
        symbol: 'aapl',
        start: '2026-08-01',
        end: '2026-09-30',
      }),
  );

  assertCondition('RESULT_SYMBOL_PRESERVED', result.symbol === 'AAPL');

  assertCondition(
    'ALL_AVAILABLE_RELEVANT_DATES_INCLUDED',
    result.dates.length === 5,
  );

  assertCondition(
    'EX_DATE_IDENTIFIED',
    result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-1' &&
        item.type === 'EX_DATE' &&
        item.date.toISOString() === '2026-08-17T00:00:00.000Z',
    ),
  );

  assertCondition(
    'RECORD_DATE_IDENTIFIED',
    result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-1' &&
        item.type === 'RECORD_DATE' &&
        item.date.toISOString() === '2026-08-18T00:00:00.000Z',
    ),
  );

  assertCondition(
    'PAYABLE_DATE_IDENTIFIED',
    result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-1' &&
        item.type === 'PAYABLE_DATE' &&
        item.date.toISOString() === '2026-08-20T00:00:00.000Z',
    ),
  );

  assertCondition(
    'MISSING_RECORD_DATE_IGNORED',
    !result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-2' && item.type === 'RECORD_DATE',
    ),
  );

  assertCondition(
    'SECOND_DIVIDEND_EX_DATE_INCLUDED',
    result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-2' && item.type === 'EX_DATE',
    ),
  );

  assertCondition(
    'SECOND_DIVIDEND_PAYABLE_DATE_INCLUDED',
    result.dates.some(
      (item) =>
        item.corporateActionId === 'dividend-2' && item.type === 'PAYABLE_DATE',
    ),
  );

  const timestamps = result.dates.map((item) => item.date.getTime());

  assertCondition(
    'DATES_SORTED_ASCENDING',
    timestamps.every(
      (timestamp, index) => index === 0 || timestamps[index - 1] <= timestamp,
    ),
  );

  assertCondition(
    'RATE_PRESERVED',
    result.dates
      .filter((item) => item.corporateActionId === 'dividend-1')
      .every((item) => item.rate === 0.25),
  );

  assertCondition(
    'CURRENCY_PRESERVED',
    result.dates
      .filter((item) => item.corporateActionId === 'dividend-1')
      .every((item) => item.currency === 'USD'),
  );

  const sourceExDate = dividends[0].exDate;

  if (sourceExDate === null) {
    throw new Error('Unexpected null source ex-date');
  }

  const returnedExDate = result.dates.find(
    (item) =>
      item.corporateActionId === 'dividend-1' && item.type === 'EX_DATE',
  );

  if (!returnedExDate) {
    throw new Error('Expected returned ex-date');
  }

  assertCondition(
    'DATE_DEFENSIVELY_COPIED',
    returnedExDate.date !== sourceExDate,
  );

  const originalSourceTimestamp = sourceExDate.getTime();

  returnedExDate.date.setUTCFullYear(2035);

  assertCondition(
    'SOURCE_DATE_NOT_MUTATED',
    sourceExDate.getTime() === originalSourceTimestamp,
  );

  const repeated = await service.getRelevantDates({
    symbol: 'aapl',
    start: '2026-08-01',
    end: '2026-09-30',
  });

  assertCondition(
    'REPEATED_RESULT_DETERMINISTIC',
    JSON.stringify(
      repeated.dates.map((item) => ({
        id: item.corporateActionId,
        type: item.type,
        date: item.date.toISOString(),
        rate: item.rate,
        currency: item.currency,
      })),
    ) ===
      JSON.stringify([
        {
          id: 'dividend-1',
          type: 'EX_DATE',
          date: '2026-08-17T00:00:00.000Z',
          rate: 0.25,
          currency: 'USD',
        },
        {
          id: 'dividend-1',
          type: 'RECORD_DATE',
          date: '2026-08-18T00:00:00.000Z',
          rate: 0.25,
          currency: 'USD',
        },
        {
          id: 'dividend-1',
          type: 'PAYABLE_DATE',
          date: '2026-08-20T00:00:00.000Z',
          rate: 0.25,
          currency: 'USD',
        },
        {
          id: 'dividend-2',
          type: 'EX_DATE',
          date: '2026-09-17T00:00:00.000Z',
          rate: 0.3,
          currency: 'USD',
        },
        {
          id: 'dividend-2',
          type: 'PAYABLE_DATE',
          date: '2026-09-20T00:00:00.000Z',
          rate: 0.3,
          currency: 'USD',
        },
      ]),
  );

  console.log('PUNTO 239 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
