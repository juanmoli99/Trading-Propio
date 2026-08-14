import { StrategyMarketEventPolicyService } from '../src/market-events/strategy-market-event-policy.service';
import type {
  KnownCorporateActionMarketEvent,
  KnownEarningsMarketEvent,
} from '../src/market-events/known-market-event.types';
import type { StrategyMarketEventPolicy } from '../src/market-events/strategy-market-event-policy.types';

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

function earningsEvent(date: string): KnownEarningsMarketEvent {
  return {
    kind: 'EARNINGS',
    symbol: 'AAPL',
    eventDate: new Date(`${date}T00:00:00.000Z`),
    sourceId: null,
  };
}

function corporateActionEvent(
  date: string,
  type: KnownCorporateActionMarketEvent['corporateActionType'],
): KnownCorporateActionMarketEvent {
  return {
    kind: 'CORPORATE_ACTION',
    symbol: 'AAPL',
    eventDate: new Date(`${date}T00:00:00.000Z`),
    sourceId: 'ca-1',
    corporateActionType: type,
  };
}

function main(): void {
  const service = new StrategyMarketEventPolicyService();

  const strategyA: StrategyMarketEventPolicy = {
    strategyId: 'strategy-a',
    rules: [
      {
        id: 'earnings-block',
        eventKind: 'EARNINGS',
        action: 'BLOCK_ENTRY',
        beforeDays: 2,
        afterDays: 1,
      },
    ],
  };

  const strategyB: StrategyMarketEventPolicy = {
    strategyId: 'strategy-b',
    rules: [
      {
        id: 'earnings-reduce',
        eventKind: 'EARNINGS',
        action: 'REDUCE_POSITION_SIZE',
        beforeDays: 3,
        afterDays: 0,
        positionSizeMultiplier: 0.5,
      },
    ],
  };

  const asOf = new Date('2026-08-18T12:00:00.000Z');

  const event = earningsEvent('2026-08-20');

  const resultA = service.evaluate({
    policy: strategyA,
    event,
    asOf,
  });

  const resultB = service.evaluate({
    policy: strategyB,
    event,
    asOf,
  });

  check('STRATEGY_A_ID_PRESERVED', resultA.strategyId === 'strategy-a');

  check('STRATEGY_B_ID_PRESERVED', resultB.strategyId === 'strategy-b');

  check(
    'DIFFERENT_STRATEGIES_APPLY_DIFFERENT_POLICIES',
    resultA.action === 'BLOCK_ENTRY' &&
      resultB.action === 'REDUCE_POSITION_SIZE',
  );

  check('BLOCK_ENTRY_DISALLOWS_ENTRY', resultA.entryAllowed === false);

  check('BLOCK_ENTRY_PRESERVES_OVERNIGHT', resultA.overnightAllowed === true);

  check('REDUCTION_MULTIPLIER_APPLIED', resultB.positionSizeMultiplier === 0.5);

  check('REDUCTION_PRESERVES_ENTRY', resultB.entryAllowed === true);

  check('CALENDAR_DAYS_TO_EVENT_CORRECT', resultA.calendarDaysToEvent === 2);

  const allowPolicy: StrategyMarketEventPolicy = {
    strategyId: 'allow-strategy',
    rules: [
      {
        id: 'allow-rule',
        eventKind: 'EARNINGS',
        action: 'ALLOW',
        beforeDays: 5,
        afterDays: 5,
      },
    ],
  };

  const allowResult = service.evaluate({
    policy: allowPolicy,
    event,
    asOf,
  });

  check(
    'ALLOW_ACTION_SUPPORTED',
    allowResult.action === 'ALLOW' &&
      allowResult.entryAllowed === true &&
      allowResult.overnightAllowed === true &&
      allowResult.positionSizeMultiplier === 1,
  );

  const overnightPolicy: StrategyMarketEventPolicy = {
    strategyId: 'overnight-strategy',
    rules: [
      {
        id: 'overnight-rule',
        eventKind: 'EARNINGS',
        action: 'PROHIBIT_OVERNIGHT',
        beforeDays: 2,
        afterDays: 0,
      },
    ],
  };

  const overnightResult = service.evaluate({
    policy: overnightPolicy,
    event,
    asOf,
  });

  check(
    'PROHIBIT_OVERNIGHT_ACTION_SUPPORTED',
    overnightResult.action === 'PROHIBIT_OVERNIGHT' &&
      overnightResult.overnightAllowed === false &&
      overnightResult.entryAllowed === true,
  );

  const postEventResult = service.evaluate({
    policy: {
      strategyId: 'post-event',
      rules: [
        {
          id: 'post-rule',
          eventKind: 'EARNINGS',
          action: 'BLOCK_ENTRY',
          beforeDays: 0,
          afterDays: 2,
        },
      ],
    },
    event: earningsEvent('2026-08-20'),
    asOf: new Date('2026-08-22T12:00:00.000Z'),
  });

  check(
    'POST_EVENT_WINDOW_SUPPORTED',
    postEventResult.action === 'BLOCK_ENTRY' &&
      postEventResult.calendarDaysToEvent === -2,
  );

  const outsideResult = service.evaluate({
    policy: strategyA,
    event: earningsEvent('2026-08-25'),
    asOf,
  });

  check(
    'OUTSIDE_WINDOW_DEFAULTS_TO_ALLOW',
    outsideResult.action === 'ALLOW' &&
      outsideResult.matchedRuleId === null &&
      outsideResult.entryAllowed === true,
  );

  const splitPolicy: StrategyMarketEventPolicy = {
    strategyId: 'split-strategy',
    rules: [
      {
        id: 'split-only',
        eventKind: 'CORPORATE_ACTION',
        action: 'BLOCK_ENTRY',
        beforeDays: 3,
        afterDays: 1,
        corporateActionTypes: ['forward_split', 'reverse_split'],
      },
    ],
  };

  const splitResult = service.evaluate({
    policy: splitPolicy,
    event: corporateActionEvent('2026-08-20', 'forward_split'),
    asOf,
  });

  check(
    'CORPORATE_ACTION_FILTER_MATCHES',
    splitResult.action === 'BLOCK_ENTRY',
  );

  const dividendResult = service.evaluate({
    policy: splitPolicy,
    event: corporateActionEvent('2026-08-20', 'cash_dividend'),
    asOf,
  });

  check(
    'CORPORATE_ACTION_FILTER_EXCLUDES_NON_MATCHING_TYPE',
    dividendResult.action === 'ALLOW' && dividendResult.matchedRuleId === null,
  );

  const firstRulePolicy: StrategyMarketEventPolicy = {
    strategyId: 'priority-strategy',
    rules: [
      {
        id: 'first-rule',
        eventKind: 'EARNINGS',
        action: 'BLOCK_ENTRY',
        beforeDays: 5,
        afterDays: 5,
      },
      {
        id: 'second-rule',
        eventKind: 'EARNINGS',
        action: 'PROHIBIT_OVERNIGHT',
        beforeDays: 5,
        afterDays: 5,
      },
    ],
  };

  const priorityResult = service.evaluate({
    policy: firstRulePolicy,
    event,
    asOf,
  });

  check(
    'RULE_PRIORITY_DETERMINISTIC_BY_DECLARATION_ORDER',
    priorityResult.matchedRuleId === 'first-rule' &&
      priorityResult.action === 'BLOCK_ENTRY',
  );

  expectThrow('DUPLICATE_RULE_ID_REJECTED', () =>
    service.evaluate({
      policy: {
        strategyId: 'duplicates',
        rules: [
          {
            id: 'same',
            eventKind: 'EARNINGS',
            action: 'ALLOW',
            beforeDays: 1,
            afterDays: 1,
          },
          {
            id: 'same',
            eventKind: 'EARNINGS',
            action: 'BLOCK_ENTRY',
            beforeDays: 1,
            afterDays: 1,
          },
        ],
      },
      event,
      asOf,
    }),
  );

  for (const invalid of [-1, 731, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(`INVALID_BEFORE_DAYS_REJECTED_${String(invalid)}`, () =>
      service.evaluate({
        policy: {
          strategyId: 'invalid',
          rules: [
            {
              id: 'invalid-rule',
              eventKind: 'EARNINGS',
              action: 'ALLOW',
              beforeDays: invalid,
              afterDays: 0,
            },
          ],
        },
        event,
        asOf,
      }),
    );
  }

  expectThrow('INVALID_REDUCTION_MULTIPLIER_REJECTED', () =>
    service.evaluate({
      policy: {
        strategyId: 'invalid-multiplier',
        rules: [
          {
            id: 'reduce',
            eventKind: 'EARNINGS',
            action: 'REDUCE_POSITION_SIZE',
            beforeDays: 2,
            afterDays: 0,
            positionSizeMultiplier: 1,
          },
        ],
      },
      event,
      asOf,
    }),
  );

  expectThrow('MULTIPLIER_ON_NON_REDUCTION_REJECTED', () =>
    service.evaluate({
      policy: {
        strategyId: 'invalid-multiplier-use',
        rules: [
          {
            id: 'block',
            eventKind: 'EARNINGS',
            action: 'BLOCK_ENTRY',
            beforeDays: 2,
            afterDays: 0,
            positionSizeMultiplier: 0.5,
          },
        ],
      },
      event,
      asOf,
    }),
  );

  expectThrow('CORPORATE_FILTER_ON_EARNINGS_REJECTED', () =>
    service.evaluate({
      policy: {
        strategyId: 'invalid-filter',
        rules: [
          {
            id: 'bad',
            eventKind: 'EARNINGS',
            action: 'ALLOW',
            beforeDays: 1,
            afterDays: 0,
            corporateActionTypes: ['cash_dividend'],
          },
        ],
      },
      event,
      asOf,
    }),
  );

  const sourceAsOf = new Date('2026-08-18T12:00:00.000Z');

  const sourceEventDate = new Date('2026-08-20T00:00:00.000Z');

  const defensiveEvent: KnownEarningsMarketEvent = {
    kind: 'EARNINGS',
    symbol: 'AAPL',
    eventDate: sourceEventDate,
    sourceId: null,
  };

  const defensive = service.evaluate({
    policy: strategyA,
    event: defensiveEvent,
    asOf: sourceAsOf,
  });

  check('AS_OF_DEFENSIVELY_COPIED', defensive.asOf !== sourceAsOf);

  check(
    'EVENT_DATE_DEFENSIVELY_COPIED',
    defensive.eventDate !== sourceEventDate,
  );

  defensive.asOf.setUTCFullYear(2000);
  defensive.eventDate.setUTCFullYear(2000);

  check(
    'SOURCE_AS_OF_NOT_MUTATED',
    sourceAsOf.toISOString() === '2026-08-18T12:00:00.000Z',
  );

  check(
    'SOURCE_EVENT_DATE_NOT_MUTATED',
    sourceEventDate.toISOString() === '2026-08-20T00:00:00.000Z',
  );

  const first = service.evaluate({
    policy: strategyA,
    event,
    asOf,
  });

  const second = service.evaluate({
    policy: strategyA,
    event,
    asOf,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    first.strategyId === second.strategyId &&
      first.symbol === second.symbol &&
      first.eventKind === second.eventKind &&
      first.eventDate.getTime() === second.eventDate.getTime() &&
      first.asOf.getTime() === second.asOf.getTime() &&
      first.calendarDaysToEvent === second.calendarDaysToEvent &&
      first.matchedRuleId === second.matchedRuleId &&
      first.action === second.action &&
      first.positionSizeMultiplier === second.positionSizeMultiplier &&
      first.entryAllowed === second.entryAllowed &&
      first.overnightAllowed === second.overnightAllowed &&
      first.reason === second.reason,
  );

  console.log('PUNTO 241 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

