const assert = require('node:assert/strict');

const {
  CorporateActionCashDividendService,
} = require('../dist/src/corporate-actions/corporate-action-cash-dividend.service.js');

async function main() {
  const receivedQueries = [];

  const corporateActionsService = {
    async getAllCorporateActions(query) {
      receivedQueries.push(structuredClone(query));

      return {
        items: [
          {
            id: 'dividend-1',
            type: 'cash_dividend',
            symbol: 'AAPL',
            processDate: new Date('2026-08-10T00:00:00.000Z'),
            raw: {
              id: 'dividend-1',
              symbol: 'AAPL',
              process_date: '2026-08-10',
              rate: '0.25',
              currency: 'usd',
              ex_date: '2026-08-08',
              record_date: '2026-08-09',
              payable_date: '2026-08-15',
            },
          },
          {
            id: 'non-dividend',
            type: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            raw: {
              old_rate: '1',
              new_rate: '2',
            },
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  };

  const service = new CorporateActionCashDividendService(
    corporateActionsService,
  );

  const result = await service.getCashDividends({
    symbol: ' aapl ',
    start: '2026-08-01',
    end: '2026-08-31',
  });

  const dividend = result.dividends[0];

  let invalidSymbolRejected = false;

  try {
    await service.getCashDividends({
      symbol: 'BAD SYMBOL',
    });
  } catch {
    invalidSymbolRejected = true;
  }

  async function expectBroken(item) {
    const brokenService =
      new CorporateActionCashDividendService({
        async getAllCorporateActions() {
          return {
            items: [item],
            pagesFetched: 1,
            complete: true,
            nextPageToken: null,
          };
        },
      });

    try {
      await brokenService.getCashDividends({
        symbol: 'AAPL',
      });

      return false;
    } catch {
      return true;
    }
  }

  const missingSymbolRejected = await expectBroken({
    id: 'missing-symbol',
    type: 'cash_dividend',
    symbol: null,
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0.25',
    },
  });

  const missingProcessDateRejected = await expectBroken({
    id: 'missing-date',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: null,
    raw: {
      rate: '0.25',
    },
  });

  const zeroRateRejected = await expectBroken({
    id: 'zero-rate',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0',
    },
  });

  const negativeRateRejected = await expectBroken({
    id: 'negative-rate',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '-1',
    },
  });

  const invalidRateRejected = await expectBroken({
    id: 'invalid-rate',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: 'abc',
    },
  });

  const invalidCurrencyRejected = await expectBroken({
    id: 'invalid-currency',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0.25',
      currency: 'US',
    },
  });

  const invalidExDateRejected = await expectBroken({
    id: 'invalid-ex-date',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0.25',
      ex_date: '2026/08/08',
    },
  });

  const invalidRecordDateRejected = await expectBroken({
    id: 'invalid-record-date',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0.25',
      record_date: 'invalid',
    },
  });

  const invalidPayableDateRejected = await expectBroken({
    id: 'invalid-payable-date',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    raw: {
      rate: '0.25',
      payable_date: '',
    },
  });

  const originalProcessDate =
    dividend.processDate.toISOString();

  const originalExDate =
    dividend.exDate?.toISOString();

  dividend.processDate.setUTCFullYear(2000);

  if (dividend.exDate) {
    dividend.exDate.setUTCFullYear(2000);
  }

  const secondResult = await service.getCashDividends({
    symbol: 'AAPL',
  });

  const secondDividend = secondResult.dividends[0];

  const firstQuery = receivedQueries[0];

  const assertions = {
    SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    QUERY_SCOPED_TO_CASH_DIVIDENDS:
      Array.isArray(firstQuery?.types) &&
      firstQuery.types.length === 1 &&
      firstQuery.types[0] === 'cash_dividend',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(firstQuery?.symbols) &&
      firstQuery.symbols.length === 1 &&
      firstQuery.symbols[0] === 'AAPL',

    DATE_FILTERS_PRESERVED:
      firstQuery?.start === '2026-08-01' &&
      firstQuery?.end === '2026-08-31',

    SORT_ASC_USED:
      firstQuery?.sort === 'asc',

    ONLY_CASH_DIVIDENDS_INCLUDED:
      result.dividends.length === 1 &&
      result.dividends[0].id === 'dividend-1',

    RATE_NORMALIZED:
      dividend.rate === 0.25,

    CURRENCY_NORMALIZED:
      dividend.currency === 'USD',

    PROCESS_DATE_PRESERVED:
      originalProcessDate ===
      '2026-08-10T00:00:00.000Z',

    EX_DATE_PRESERVED:
      originalExDate ===
      '2026-08-08T00:00:00.000Z',

    RECORD_DATE_PRESERVED:
      dividend.recordDate?.toISOString() ===
      '2026-08-09T00:00:00.000Z',

    PAYABLE_DATE_PRESERVED:
      dividend.payableDate?.toISOString() ===
      '2026-08-15T00:00:00.000Z',

    INVALID_SYMBOL_REJECTED:
      invalidSymbolRejected,

    MISSING_SYMBOL_REJECTED:
      missingSymbolRejected,

    MISSING_PROCESS_DATE_REJECTED:
      missingProcessDateRejected,

    ZERO_RATE_REJECTED:
      zeroRateRejected,

    NEGATIVE_RATE_REJECTED:
      negativeRateRejected,

    INVALID_RATE_REJECTED:
      invalidRateRejected,

    INVALID_CURRENCY_REJECTED:
      invalidCurrencyRejected,

    INVALID_EX_DATE_REJECTED:
      invalidExDateRejected,

    INVALID_RECORD_DATE_REJECTED:
      invalidRecordDateRejected,

    INVALID_PAYABLE_DATE_REJECTED:
      invalidPayableDateRejected,

    PROCESS_DATE_DEFENSIVELY_COPIED:
      secondDividend.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',

    OPTIONAL_DATE_DEFENSIVELY_COPIED:
      secondDividend.exDate?.toISOString() ===
      '2026-08-08T00:00:00.000Z',
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o más verificaciones del punto 171 fallaron',
  );

  console.log('PUNTO 171 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});