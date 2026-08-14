import { CorporateActionEntryBlockService } from '../src/corporate-actions/corporate-action-entry-block.service';
import type { CorporateActionPendingService } from '../src/corporate-actions/corporate-action-pending.service';
import type { CorporateActionType } from '../src/corporate-actions/corporate-actions.types';

async function main(): Promise<void> {
  let capturedQuery: any = null;

  const ambiguousTypes: CorporateActionType[] = [
    'reverse_split',
    'forward_split',
    'unit_split',
    'stock_dividend',
    'spin_off',
    'cash_merger',
    'stock_merger',
    'stock_and_cash_merger',
    'redemption',
    'name_change',
    'worthless_removal',
    'rights_distribution',
    'reorganization',
    'partial_call',
  ];

  const record = (
    id: string,
    type: CorporateActionType,
    symbol: string | null = 'AAPL',
    processDate = new Date('2026-08-14T00:00:00.000Z'),
  ) => ({
    id,
    type,
    symbol,
    processDate,
    raw: {},
  });

  const dependency = {
    async getPendingActions(query: Record<string, unknown>) {
      capturedQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        pending: [
          record('split-1', 'forward_split', ' aapl '),
          record('dividend-1', 'cash_dividend', 'AAPL'),
          record('other-symbol', 'reverse_split', 'MSFT'),
          record('unknown-symbol', 'reorganization', null),
        ],
      };
    },
  } as unknown as CorporateActionPendingService;

  const service =
    new CorporateActionEntryBlockService(dependency);

  const asOf =
    new Date('2026-08-13T15:30:00.000Z');

  const result = await service.evaluate({
    symbol: ' aapl ',
    asOf,
    end: '2026-12-31',
  });

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',

    QUERY_AS_OF_PRESERVED:
      capturedQuery?.asOf === asOf,

    QUERY_END_PRESERVED:
      capturedQuery?.end === '2026-12-31',

    ENTRY_BLOCKED:
      result.entryBlocked === true,

    BLOCK_STATUS_CORRECT:
      result.status ===
      'BLOCKED_AMBIGUOUS_CORPORATE_ACTION',

    MATCHING_AMBIGUOUS_ACTION_INCLUDED:
      result.ambiguousActions.some(
        (item) =>
          item.corporateActionId === 'split-1',
      ),

    CASH_DIVIDEND_NOT_BLOCKING:
      !result.ambiguousActions.some(
        (item) =>
          item.corporateActionId === 'dividend-1',
      ),

    OTHER_SYMBOL_NOT_BLOCKING:
      !result.ambiguousActions.some(
        (item) =>
          item.corporateActionId === 'other-symbol',
      ),

    NULL_SYMBOL_FAIL_SAFE_BLOCKING:
      result.ambiguousActions.some(
        (item) =>
          item.corporateActionId ===
          'unknown-symbol',
      ),

    EXACTLY_TWO_AMBIGUOUS_ACTIONS:
      result.ambiguousActions.length === 2,

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      result.ambiguousActions[0]
        ?.processDate.toISOString() ===
      '2026-08-14T00:00:00.000Z',

    REASONS_PRESENT:
      result.ambiguousActions.every(
        (item) => item.reason.trim().length > 0,
      ),
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
    'ASSERT_ENTRY_ALLOWED_REJECTS_AMBIGUOUS_STATE',
    () =>
      service.assertEntryAllowed({
        symbol: 'AAPL',
        asOf,
      }),
  );

  const safeDependency = {
    async getPendingActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        pending: [
          record(
            'cash-only',
            'cash_dividend',
            'AAPL',
          ),
        ],
      };
    },
  } as unknown as CorporateActionPendingService;

  const safeService =
    new CorporateActionEntryBlockService(
      safeDependency,
    );

  const safeResult = await safeService.evaluate({
    symbol: 'AAPL',
    asOf,
  });

  checks.CASH_DIVIDEND_ONLY_ALLOWED =
    safeResult.entryBlocked === false &&
    safeResult.status === 'ALLOWED' &&
    safeResult.ambiguousActions.length === 0;

  try {
    await safeService.assertEntryAllowed({
      symbol: 'AAPL',
      asOf,
    });

    checks.ASSERT_ENTRY_ALLOWED_PASSES_SAFE_STATE =
      true;
  } catch {
    checks.ASSERT_ENTRY_ALLOWED_PASSES_SAFE_STATE =
      false;
  }

  const emptyDependency = {
    async getPendingActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        pending: [],
      };
    },
  } as unknown as CorporateActionPendingService;

  const emptyResult =
    await new CorporateActionEntryBlockService(
      emptyDependency,
    ).evaluate({
      symbol: 'AAPL',
    });

  checks.NO_PENDING_ACTIONS_ALLOWED =
    emptyResult.entryBlocked === false &&
    emptyResult.status === 'ALLOWED';

  for (const type of ambiguousTypes) {
    const dep = {
      async getPendingActions() {
        return {
          asOf: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          pending: [
            record(
              `type-${type}`,
              type,
              'AAPL',
            ),
          ],
        };
      },
    } as unknown as CorporateActionPendingService;

    const typeResult =
      await new CorporateActionEntryBlockService(
        dep,
      ).evaluate({
        symbol: 'AAPL',
      });

    checks[
      `AMBIGUOUS_TYPE_${type.toUpperCase()}_BLOCKS`
    ] =
      typeResult.entryBlocked === true &&
      typeResult.status ===
        'BLOCKED_AMBIGUOUS_CORPORATE_ACTION' &&
      typeResult.ambiguousActions.length === 1;
  }

  await expectRejected(
    'INVALID_REQUEST_SYMBOL_REJECTED',
    () =>
      service.evaluate({
        symbol: 'BAD SYMBOL',
      }),
  );

  const invalidIdDependency = {
    async getPendingActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        pending: [
          record(
            '   ',
            'forward_split',
            'AAPL',
          ),
        ],
      };
    },
  } as unknown as CorporateActionPendingService;

  await expectRejected(
    'INVALID_ACTION_ID_REJECTED',
    () =>
      new CorporateActionEntryBlockService(
        invalidIdDependency,
      ).evaluate({
        symbol: 'AAPL',
      }),
  );

  const invalidDateDependency = {
    async getPendingActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        pending: [
          record(
            'bad-date',
            'forward_split',
            'AAPL',
            new Date(Number.NaN),
          ),
        ],
      };
    },
  } as unknown as CorporateActionPendingService;

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      new CorporateActionEntryBlockService(
        invalidDateDependency,
      ).evaluate({
        symbol: 'AAPL',
      }),
  );

  const invalidSymbolDependency = {
    async getPendingActions() {
      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        pending: [
          record(
            'bad-symbol',
            'forward_split',
            'BAD SYMBOL',
          ),
        ],
      };
    },
  } as unknown as CorporateActionPendingService;

  await expectRejected(
    'INVALID_ACTION_SYMBOL_REJECTED',
    () =>
      new CorporateActionEntryBlockService(
        invalidSymbolDependency,
      ).evaluate({
        symbol: 'AAPL',
      }),
  );

  const firstRun = await service.evaluate({
    symbol: 'AAPL',
    asOf,
    end: '2026-12-31',
  });

  const secondRun = await service.evaluate({
    symbol: 'AAPL',
    asOf,
    end: '2026-12-31',
  });

  checks.REPEATED_EVALUATION_DETERMINISTIC =
    JSON.stringify(firstRun) ===
    JSON.stringify(secondRun);

  checks.NO_AUTOMATIC_ORDER_ACTIONS =
    typeof (service as any).cancelOrder ===
      'undefined' &&
    typeof (service as any).replaceOrder ===
      'undefined' &&
    typeof (service as any).submitOrder ===
      'undefined';

  for (
    const [name, passed] of
    Object.entries(checks)
  ) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 189 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 189 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 189 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
