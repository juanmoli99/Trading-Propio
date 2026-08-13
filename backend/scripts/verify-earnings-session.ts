import { normalizeFinnhubEarningsCalendarResponse } from '../src/market-events/finnhub-earnings.mapper';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function event(hour: unknown): Record<string, unknown> {
  return {
    symbol: 'AAPL',
    date: '2026-10-28',
    hour,
  };
}

function main(): void {
  const preMarket = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('bmo')],
  });

  check('BMO_CLASSIFIED_PRE_MARKET', preMarket[0]?.session === 'PRE_MARKET');

  const postMarket = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('amc')],
  });

  check('AMC_CLASSIFIED_POST_MARKET', postMarket[0]?.session === 'POST_MARKET');

  const duringMarket = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('dmh')],
  });

  check(
    'DMH_CLASSIFIED_DURING_MARKET',
    duringMarket[0]?.session === 'DURING_MARKET',
  );

  const uppercase = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('BMO'), event('AMC'), event('DMH')],
  });

  check(
    'SESSION_CODES_CASE_INSENSITIVE',
    uppercase[0]?.session === 'PRE_MARKET' &&
      uppercase[1]?.session === 'POST_MARKET' &&
      uppercase[2]?.session === 'DURING_MARKET',
  );

  const whitespace = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('  bmo  '), event('  amc  ')],
  });

  check(
    'SESSION_CODES_TRIMMED',
    whitespace[0]?.session === 'PRE_MARKET' &&
      whitespace[1]?.session === 'POST_MARKET',
  );

  const missing = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [
      {
        symbol: 'AAPL',
        date: '2026-10-28',
      },
    ],
  });

  check('MISSING_HOUR_CLASSIFIED_UNKNOWN', missing[0]?.session === 'UNKNOWN');

  const nullHour = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event(null)],
  });

  check('NULL_HOUR_CLASSIFIED_UNKNOWN', nullHour[0]?.session === 'UNKNOWN');

  const unknown = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [event('unknown-value')],
  });

  check('UNKNOWN_CODE_CLASSIFIED_UNKNOWN', unknown[0]?.session === 'UNKNOWN');

  expectThrow('NON_STRING_HOUR_REJECTED', () =>
    normalizeFinnhubEarningsCalendarResponse({
      earningsCalendar: [event(123)],
    }),
  );

  const rawPreserved = normalizeFinnhubEarningsCalendarResponse({
    earningsCalendar: [
      {
        symbol: 'AAPL',
        date: '2026-10-28',
        hour: 'amc',
        epsEstimate: 1.23,
      },
    ],
  });

  check('RAW_HOUR_PRESERVED', rawPreserved[0]?.raw.hour === 'amc');

  check('RAW_EXTRA_DATA_PRESERVED', rawPreserved[0]?.raw.epsEstimate === 1.23);

  check('SYMBOL_PRESERVED', rawPreserved[0]?.symbol === 'AAPL');

  check('REPORT_DATE_PRESERVED', rawPreserved[0]?.reportDate === '2026-10-28');

  const input = {
    earningsCalendar: [event('bmo'), event('amc'), event('dmh')],
  };

  const first = normalizeFinnhubEarningsCalendarResponse(input);

  const second = normalizeFinnhubEarningsCalendarResponse(input);

  check(
    'REPEATED_CLASSIFICATION_DETERMINISTIC',
    first.length === second.length &&
      first.every(
        (item, index) =>
          item.symbol === second[index]?.symbol &&
          item.reportDate === second[index]?.reportDate &&
          item.session === second[index]?.session,
      ),
  );

  console.log('PUNTO 233 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
