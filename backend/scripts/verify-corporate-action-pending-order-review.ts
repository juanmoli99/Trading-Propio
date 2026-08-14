import { CorporateActionPendingOrderReviewService } from '../src/corporate-actions/corporate-action-pending-order-review.service';
import type { CorporateActionOpenOrderAssociationService } from '../src/corporate-actions/corporate-action-open-order-association.service';

async function main(): Promise<void> {
  let capturedQuery: any = null;

  const dependency = {
    async associateWithOpenOrders(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        asOf: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        associations: [
          {
            corporateAction: {
              id: 'action-1',
              type: 'forward_split',
              symbol: ' aapl ',
              processDate: new Date(
                '2026-08-10T00:00:00.000Z',
              ),
              raw: {
                marker: 'split',
              },
            },
            openOrders: [
              {
                id: 'order-1',
                clientOrderId: 'client-1',
                symbol: 'aapl',
                assetId: null,
                assetClass: null,
                side: 'buy',
                type: 'limit',
                timeInForce: 'day',
                status: 'new',
                quantity: '10',
                notional: null,
                filledQuantity: '0',
                filledAveragePrice: null,
                limitPrice: '100',
                stopPrice: null,
                submittedAt: new Date(
                  '2026-08-09T12:00:00.000Z',
                ),
                acceptedAt: new Date(
                  '2026-08-09T12:00:01.000Z',
                ),
                filledAt: null,
                canceledAt: null,
                expiredAt: null,
                replacedAt: null,
                replacedBy: null,
                replaces: null,
              },
              {
                id: 'order-2',
                clientOrderId: 'client-2',
                symbol: 'AAPL',
                assetId: null,
                assetClass: null,
                side: 'sell',
                type: 'limit',
                timeInForce: 'gtc',
                status: 'pending_cancel',
                quantity: '5',
                notional: null,
                filledQuantity: '2',
                filledAveragePrice: '101',
                limitPrice: '102',
                stopPrice: null,
                submittedAt: null,
                acceptedAt: null,
                filledAt: null,
                canceledAt: null,
                expiredAt: null,
                replacedAt: null,
                replacedBy: null,
                replaces: null,
              },
            ],
            hasOpenOrders: true,
          },
          {
            corporateAction: {
              id: 'action-2',
              type: 'cash_dividend',
              symbol: 'MSFT',
              processDate: new Date(
                '2026-08-11T00:00:00.000Z',
              ),
              raw: {
                marker: 'dividend',
              },
            },
            openOrders: [
              {
                id: 'order-3',
                clientOrderId: 'client-3',
                symbol: 'MSFT',
                assetId: null,
                assetClass: null,
                side: 'buy',
                type: 'market',
                timeInForce: 'day',
                status: 'filled',
                quantity: '1',
                notional: null,
                filledQuantity: '1',
                filledAveragePrice: '400',
                limitPrice: null,
                stopPrice: null,
                submittedAt: null,
                acceptedAt: null,
                filledAt: new Date(
                  '2026-08-11T15:00:00.000Z',
                ),
                canceledAt: null,
                expiredAt: null,
                replacedAt: null,
                replacedBy: null,
                replaces: null,
              },
            ],
            hasOpenOrders: true,
          },
          {
            corporateAction: {
              id: 'action-3',
              type: 'name_change',
              symbol: null,
              processDate: new Date(
                '2026-08-12T00:00:00.000Z',
              ),
              raw: {},
            },
            openOrders: [],
            hasOpenOrders: false,
          },
        ],
        matchedActionCount: 2,
        unmatchedActionCount: 1,
        associatedOpenOrderCount: 3,
      };
    },
  } as unknown as CorporateActionOpenOrderAssociationService;

  const service =
    new CorporateActionPendingOrderReviewService(
      dependency,
    );

  const asOf = new Date(
    '2026-08-13T15:30:00.000Z',
  );

  const result = await service.reviewPendingOrders({
    symbols: ['AAPL'],
    asOf,
    start: '2026-01-01',
  });

  const first = result.items[0];
  const second = result.items[1];
  const third = result.items[2];

  const checks: Record<string, boolean> = {
    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',

    QUERY_START_PRESERVED:
      capturedQuery?.start === '2026-01-01',

    QUERY_AS_OF_PRESERVED:
      capturedQuery?.asOf === asOf,

    THREE_REVIEW_ITEMS_CREATED:
      result.items.length === 3,

    FIRST_ACTION_REVIEW_REQUIRED:
      first?.status === 'REVIEW_REQUIRED',

    FIRST_ACTION_SYMBOL_NORMALIZED:
      first?.symbol === 'AAPL',

    FIRST_ACTION_TWO_OPEN_ORDERS:
      first?.openOrders.length === 2,

    FIRST_ORDER_CANCELABLE:
      first?.openOrders[0]?.cancelable === true,

    SECOND_ORDER_CANCELABLE:
      first?.openOrders[1]?.cancelable === true,

    FILLED_ORDER_NOT_CANCELABLE:
      second?.openOrders[0]?.cancelable === false,

    THIRD_ACTION_NO_OPEN_ORDERS:
      third?.status === 'NO_OPEN_ORDERS',

    NULL_SYMBOL_PRESERVED:
      third?.symbol === null,

    REVIEW_REQUIRED_COUNT_CORRECT:
      result.reviewRequiredCount === 2,

    NO_OPEN_ORDERS_COUNT_CORRECT:
      result.noOpenOrdersCount === 1,

    AFFECTED_OPEN_ORDER_COUNT_CORRECT:
      result.affectedOpenOrderCount === 3,

    CANCELABLE_OPEN_ORDER_COUNT_CORRECT:
      result.cancelableOpenOrderCount === 2,

    NO_AUTOMATIC_ACTION:
      result.automaticActionTaken === false &&
      result.items.every(
        (item) =>
          item.automaticActionTaken === false &&
          item.openOrders.every(
            (order) =>
              order.automaticActionTaken === false,
          ),
      ),

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      first?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',

    ORDER_FIELDS_PRESERVED:
      first?.openOrders[0]?.orderId === 'order-1' &&
      first.openOrders[0]?.clientOrderId ===
        'client-1' &&
      first.openOrders[0]?.quantity === '10' &&
      first.openOrders[0]?.filledQuantity === '0',
  };

  const createService = (
    association: Record<string, unknown>,
  ) => {
    const dep = {
      async associateWithOpenOrders() {
        return {
          asOf: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          associations: [association],
          matchedActionCount: 1,
          unmatchedActionCount: 0,
          associatedOpenOrderCount: 1,
        };
      },
    } as unknown as CorporateActionOpenOrderAssociationService;

    return new CorporateActionPendingOrderReviewService(
      dep,
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
    'INVALID_ACTION_ID_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: '   ',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [],
        hasOpenOrders: false,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INVALID_ACTION_SYMBOL_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'bad-symbol',
          type: 'forward_split',
          symbol: 'BAD SYMBOL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [],
        hasOpenOrders: false,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'bad-date',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(Number.NaN),
          raw: {},
        },
        openOrders: [],
        hasOpenOrders: false,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INCONSISTENT_ASSOCIATION_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'inconsistent',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [],
        hasOpenOrders: true,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INVALID_ORDER_ID_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'action',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [
          {
            id: '   ',
            clientOrderId: 'client',
            symbol: 'AAPL',
            side: 'buy',
            type: 'limit',
            timeInForce: 'day',
            status: 'new',
            quantity: '1',
            notional: null,
            filledQuantity: '0',
          },
        ],
        hasOpenOrders: true,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INVALID_CLIENT_ORDER_ID_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'action',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [
          {
            id: 'order',
            clientOrderId: '   ',
            symbol: 'AAPL',
            side: 'buy',
            type: 'limit',
            timeInForce: 'day',
            status: 'new',
            quantity: '1',
            notional: null,
            filledQuantity: '0',
          },
        ],
        hasOpenOrders: true,
      }).reviewPendingOrders(),
  );

  await expectRejected(
    'INVALID_ORDER_SYMBOL_REJECTED',
    () =>
      createService({
        corporateAction: {
          id: 'action',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          raw: {},
        },
        openOrders: [
          {
            id: 'order',
            clientOrderId: 'client',
            symbol: 'BAD SYMBOL',
            side: 'buy',
            type: 'limit',
            timeInForce: 'day',
            status: 'new',
            quantity: '1',
            notional: null,
            filledQuantity: '0',
          },
        ],
        hasOpenOrders: true,
      }).reviewPendingOrders(),
  );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 188 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 188 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 188 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
