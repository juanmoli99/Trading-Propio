import { KnownMarketEventsService } from '../src/market-events/known-market-events.service';

async function main(): Promise<void> {
  const sourceAsOf = new Date('2026-08-13T15:30:00.000Z');

  const earningsService = {
    async getNextEarnings() {
      return {
        symbol: 'AAPL',
        asOf: new Date(sourceAsOf),
        lookaheadDays: 30,
        event: {
          symbol: 'AAPL',
          reportDate: '2026-08-20',
          session: 'POST_MARKET',
          raw: { source: 'earnings' },
        },
      };
    },
  };

  const corporateActionsService = {
    async getAllCorporateActions() {
      return {
        items: [
          {
            id: 'ca-later',
            type: 'cash_dividend',
            symbol: 'AAPL',
            processDate: new Date('2026-08-25T00:00:00.000Z'),
            raw: {},
          },
          {
            id: 'ca-earlier',
            type: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date('2026-08-18T00:00:00.000Z'),
            raw: {},
          },
          {
            id: 'ca-other',
            type: 'cash_dividend',
            symbol: 'MSFT',
            processDate: new Date('2026-08-17T00:00:00.000Z'),
            raw: {},
          },
          {
            id: 'ca-no-date',
            type: 'cash_dividend',
            symbol: 'AAPL',
            processDate: null,
            raw: {},
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  };

  const service = new KnownMarketEventsService(
    earningsService as never,
    corporateActionsService as never,
  );

  const result = await service.getKnownEvents({
    symbol: ' aapl ',
    asOf: sourceAsOf,
    lookaheadDays: 30,
  });

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED: result.symbol === 'AAPL',
    AS_OF_PRESERVED: result.asOf.toISOString() === '2026-08-13T15:30:00.000Z',
    LOOKAHEAD_PRESERVED: result.lookaheadDays === 30,
    THREE_RELEVANT_EVENTS_INCLUDED: result.events.length === 3,
    EVENTS_SORTED_ASCENDING:
      result.events
        .map((event) => event.eventDate.toISOString().slice(0, 10))
        .join(',') === '2026-08-18,2026-08-20,2026-08-25',
    EARNINGS_INCLUDED: result.events.some(
      (event) =>
        event.kind === 'EARNINGS' &&
        event.symbol === 'AAPL' &&
        event.eventDate.toISOString().slice(0, 10) === '2026-08-20',
    ),
    CORPORATE_ACTIONS_INCLUDED:
      result.events.filter((event) => event.kind === 'CORPORATE_ACTION')
        .length === 2,
    CORPORATE_ACTION_TYPE_PRESERVED: result.events.some(
      (event) =>
        event.kind === 'CORPORATE_ACTION' &&
        event.sourceId === 'ca-earlier' &&
        event.corporateActionType === 'forward_split',
    ),
    OTHER_SYMBOL_EXCLUDED: !result.events.some(
      (event) =>
        event.kind === 'CORPORATE_ACTION' && event.sourceId === 'ca-other',
    ),
    NULL_DATE_EXCLUDED: !result.events.some(
      (event) =>
        event.kind === 'CORPORATE_ACTION' && event.sourceId === 'ca-no-date',
    ),
    AS_OF_DEFENSIVELY_COPIED: result.asOf !== sourceAsOf,
  };

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error('Punto 240 verification failed');
  }

  result.asOf.setUTCFullYear(2000);

  console.log(
    `INPUT_AS_OF_NOT_MUTATED: ${
      sourceAsOf.toISOString() === '2026-08-13T15:30:00.000Z'
    }`,
  );

  let invalidSymbolRejected = false;

  try {
    await service.getKnownEvents({
      symbol: 'AA PL',
      asOf: sourceAsOf,
      lookaheadDays: 30,
    });
  } catch {
    invalidSymbolRejected = true;
  }

  console.log(`INVALID_SYMBOL_REJECTED: ${invalidSymbolRejected}`);

  let invalidLookaheadRejected = false;

  try {
    await service.getKnownEvents({
      symbol: 'AAPL',
      asOf: sourceAsOf,
      lookaheadDays: 0,
    });
  } catch {
    invalidLookaheadRejected = true;
  }

  console.log(`INVALID_LOOKAHEAD_REJECTED: ${invalidLookaheadRejected}`);

  if (
    sourceAsOf.toISOString() !== '2026-08-13T15:30:00.000Z' ||
    !invalidSymbolRejected ||
    !invalidLookaheadRejected
  ) {
    throw new Error('Punto 240 defensive verification failed');
  }

  console.log('PUNTO 240 VERIFICADO CORRECTAMENTE.');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
