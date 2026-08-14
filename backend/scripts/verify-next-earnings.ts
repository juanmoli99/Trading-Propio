import { NextEarningsService } from '../src/market-events/next-earnings.service';
import type {
  EarningsCalendarQuery,
  EarningsCalendarResult,
} from '../src/market-events/earnings-calendar.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

class FakeEarningsCalendarService {
  readonly queries: EarningsCalendarQuery[] = [];

  result: EarningsCalendarResult = {
    start: '2026-08-13',
    end: '2027-08-13',
    events: [],
  };

  async getCalendar(
    query: EarningsCalendarQuery,
  ): Promise<EarningsCalendarResult> {
    this.queries.push({
      ...query,
      symbols: query.symbols ? [...query.symbols] : undefined,
    });

    return {
      ...this.result,
      events: this.result.events.map((event) => ({
        ...event,
        raw: { ...event.raw },
      })),
    };
  }
}

async function main(): Promise<void> {
  const calendar = new FakeEarningsCalendarService();

  const service = new NextEarningsService(calendar as never);

  const asOf = new Date('2026-08-13T15:30:00.000Z');

  calendar.result = {
    start: '2026-08-13',
    end: '2026-09-12',
    events: [
      {
        symbol: 'MSFT',
        reportDate: '2026-08-20',
        session: 'UNKNOWN',
        raw: { id: 'other-symbol' },
      },
      {
        symbol: 'AAPL',
        reportDate: '2026-09-01',
        session: 'POST_MARKET',
        raw: { id: 'later' },
      },
      {
        symbol: 'AAPL',
        reportDate: '2026-08-20',
        session: 'PRE_MARKET',
        raw: { id: 'nearest' },
      },
      {
        symbol: 'AAPL',
        reportDate: '2026-08-12',
        session: 'UNKNOWN',
        raw: { id: 'past' },
      },
    ],
  };

  const result = await service.getNextEarnings({
    symbol: '  aapl  ',
    asOf,
    lookaheadDays: 30,
  });

  check('SYMBOL_NORMALIZED', result.symbol === 'AAPL');

  check('AS_OF_PRESERVED', result.asOf.getTime() === asOf.getTime());

  check('AS_OF_DEFENSIVELY_COPIED', result.asOf !== asOf);

  check('LOOKAHEAD_PRESERVED', result.lookaheadDays === 30);

  check('CALENDAR_CALLED_ONCE', calendar.queries.length === 1);

  const firstQuery = calendar.queries[0];

  check('QUERY_START_CORRECT', firstQuery?.start === '2026-08-13');

  check('QUERY_END_CORRECT', firstQuery?.end === '2026-09-12');

  check(
    'QUERY_SYMBOL_NORMALIZED',
    firstQuery?.symbols?.length === 1 && firstQuery.symbols[0] === 'AAPL',
  );

  check(
    'NEAREST_FUTURE_EARNINGS_SELECTED',
    result.event?.reportDate === '2026-08-20',
  );

  check('OTHER_SYMBOL_IGNORED', result.event?.symbol === 'AAPL');

  check('PAST_EVENT_IGNORED', result.event?.raw.id !== 'past');

  check('LATER_EVENT_NOT_SELECTED', result.event?.raw.id === 'nearest');

  if (result.event === null) {
    throw new Error('Expected earnings event');
  }

  const originalRaw = calendar.result.events[2]?.raw;

  check('EVENT_RAW_DEFENSIVELY_COPIED', result.event.raw !== originalRaw);

  calendar.result = {
    start: '2026-08-13',
    end: '2026-08-20',
    events: [
      {
        symbol: 'AAPL',
        reportDate: '2026-08-13',
        session: 'DURING_MARKET',
        raw: { id: 'same-day' },
      },
    ],
  };

  const sameDay = await service.getNextEarnings({
    symbol: 'AAPL',
    asOf,
    lookaheadDays: 7,
  });

  check(
    'SAME_DAY_EARNINGS_INCLUDED',
    sameDay.event?.reportDate === '2026-08-13',
  );

  calendar.result = {
    start: '2026-08-13',
    end: '2026-08-20',
    events: [],
  };

  const missing = await service.getNextEarnings({
    symbol: 'AAPL',
    asOf,
    lookaheadDays: 7,
  });

  check('NO_EARNINGS_RETURNS_NULL', missing.event === null);

  calendar.result = {
    start: '2026-08-13',
    end: '2027-08-13',
    events: [],
  };

  const defaultLookahead = await service.getNextEarnings({
    symbol: 'AAPL',
    asOf,
  });

  check('DEFAULT_LOOKAHEAD_365', defaultLookahead.lookaheadDays === 365);

  const defaultQuery = calendar.queries[calendar.queries.length - 1];

  check('DEFAULT_LOOKAHEAD_END_CORRECT', defaultQuery?.end === '2027-08-13');

  for (const invalid of ['', '   ', 'A B', 'A'.repeat(33)]) {
    await expectReject(
      `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalid)}`,
      () =>
        service.getNextEarnings({
          symbol: invalid,
          asOf,
        }),
    );
  }

  await expectReject('INVALID_AS_OF_REJECTED', () =>
    service.getNextEarnings({
      symbol: 'AAPL',
      asOf: new Date(Number.NaN),
    }),
  );

  for (const invalid of [
    0,
    -1,
    1.5,
    731,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    await expectReject(`INVALID_LOOKAHEAD_REJECTED_${String(invalid)}`, () =>
      service.getNextEarnings({
        symbol: 'AAPL',
        asOf,
        lookaheadDays: invalid,
      }),
    );
  }

  calendar.result = {
    start: '2026-08-13',
    end: '2026-09-12',
    events: [
      {
        symbol: 'AAPL',
        reportDate: '2026-08-20',
        session: 'POST_MARKET',
        raw: { id: 'deterministic' },
      },
    ],
  };

  const deterministicInput = {
    symbol: 'AAPL',
    asOf,
    lookaheadDays: 30,
  };

  const first = await service.getNextEarnings(deterministicInput);

  const second = await service.getNextEarnings(deterministicInput);

  check(
    'REPEATED_RESULT_DETERMINISTIC',
    first.symbol === second.symbol &&
      first.asOf.getTime() === second.asOf.getTime() &&
      first.lookaheadDays === second.lookaheadDays &&
      first.event?.symbol === second.event?.symbol &&
      first.event?.reportDate === second.event?.reportDate &&
      first.event?.raw.id === second.event?.raw.id,
  );

  check(
    'INPUT_AS_OF_NOT_MUTATED',
    asOf.toISOString() === '2026-08-13T15:30:00.000Z',
  );

  console.log('PUNTO 232 VERIFICADO CORRECTAMENTE.');
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

