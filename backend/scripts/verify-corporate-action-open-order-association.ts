import { CorporateActionOpenOrderAssociationService } from '../src/corporate-actions/corporate-action-open-order-association.service';
import type { AlpacaOrderService } from '../src/alpaca/alpaca-order.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';

async function main(): Promise<void> {
  let capturedOrderOptions: any = null;

  const effectiveAction = {
    id: 'action-aapl',
    type: 'forward_split',
    symbol: ' aapl ',
    processDate: new Date('2026-08-13T00:00:00.000Z'),
    raw: { marker: 'action' },
  } as const;

  const effectiveService = {
    async getEffectiveActions() {
      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        effective: [
          effectiveAction,
          {
            id: 'action-msft',
            type: 'cash_dividend',
            symbol: 'MSFT',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            raw: { marker: 'unmatched' },
          },
          {
            id: 'action-null',
            type: 'reorganization',
            symbol: null,
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            raw: { marker: 'null-symbol' },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const submittedAt = new Date('2026-08-13T13:00:00.000Z');

  const order1 = {
    id: 'order-1',
    clientOrderId: 'client-1',
    symbol: 'AAPL',
    assetId: 'asset-aapl',
    assetClass: 'us_equity',
    side: 'buy',
    type: 'limit',
    timeInForce: 'day',
    status: 'new',
    quantity: '10',
    notional: null,
    filledQuantity: '0',
    filledAveragePrice: null,
    limitPrice: '150',
    stopPrice: null,
    submittedAt,
    acceptedAt: null,
    filledAt: null,
    canceledAt: null,
    expiredAt: null,
    replacedAt: null,
    replacedBy: null,
    replaces: null,
  };

  const order2 = {
    ...order1,
    id: 'order-2',
    clientOrderId: 'client-2',
    symbol: ' aapl ',
    side: 'sell',
    quantity: '5',
  };

  const unrelatedOrder = {
    ...order1,
    id: 'order-3',
    clientOrderId: 'client-3',
    symbol: 'TSLA',
  };

  const orderService = {
    async getOrders(options: Record<string, unknown>) {
      capturedOrderOptions = options;

      return [
        order1,
        order2,
        unrelatedOrder,
      ];
    },
  } as unknown as AlpacaOrderService;

  const service =
    new CorporateActionOpenOrderAssociationService(
      effectiveService,
      orderService,
    );

  const result = await service.associateWithOpenOrders();

  const matched = result.associations.find(
    (association) =>
      association.corporateAction.id === 'action-aapl',
  );

  const unmatched = result.associations.find(
    (association) =>
      association.corporateAction.id === 'action-msft',
  );

  const nullSymbol = result.associations.find(
    (association) =>
      association.corporateAction.id === 'action-null',
  );

  const checks: Record<string, boolean> = {
    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    QUERY_ONLY_OPEN_ORDERS:
      capturedOrderOptions?.status === 'open',

    QUERY_NESTED_ENABLED:
      capturedOrderOptions?.nested === true,

    THREE_ASSOCIATIONS_CREATED:
      result.associations.length === 3,

    MATCHED_ACTION_COUNT_CORRECT:
      result.matchedActionCount === 1,

    UNMATCHED_ACTION_COUNT_CORRECT:
      result.unmatchedActionCount === 2,

    ASSOCIATED_OPEN_ORDER_COUNT_CORRECT:
      result.associatedOpenOrderCount === 2,

    MATCHED_BY_NORMALIZED_SYMBOL:
      matched?.hasOpenOrders === true &&
      matched.openOrders.length === 2,

    FIRST_ORDER_PRESERVED:
      matched?.openOrders.some(
        (order) =>
          order.id === 'order-1' &&
          order.quantity === '10',
      ) === true,

    SECOND_ORDER_PRESERVED:
      matched?.openOrders.some(
        (order) =>
          order.id === 'order-2' &&
          order.quantity === '5',
      ) === true,

    UNRELATED_ORDER_NOT_ASSOCIATED:
      matched?.openOrders.some(
        (order) => order.id === 'order-3',
      ) === false,

    UNMATCHED_HAS_EMPTY_ORDERS:
      unmatched?.hasOpenOrders === false &&
      unmatched.openOrders.length === 0,

    NULL_SYMBOL_HAS_EMPTY_ORDERS:
      nullSymbol?.hasOpenOrders === false &&
      nullSymbol.openOrders.length === 0,

    ACTION_DEFENSIVELY_COPIED:
      matched?.corporateAction !== effectiveAction,

    RAW_PAYLOAD_PRESERVED:
      matched?.corporateAction.raw.marker === 'action',

    ORDER_DEFENSIVELY_COPIED:
      matched?.openOrders[0] !== order1,

    ORDER_DATE_DEFENSIVELY_COPIED:
      matched?.openOrders[0]?.submittedAt !== submittedAt &&
      matched?.openOrders[0]?.submittedAt?.getTime() ===
        submittedAt.getTime(),
  };

  const duplicateOrderService = {
    async getOrders() {
      return [
        order1,
        {
          ...order1,
          clientOrderId: 'duplicate-client',
        },
      ];
    },
  } as unknown as AlpacaOrderService;

  const duplicateService =
    new CorporateActionOpenOrderAssociationService(
      effectiveService,
      duplicateOrderService,
    );

  try {
    await duplicateService.associateWithOpenOrders();
    checks.DUPLICATE_ORDER_ID_REJECTED = false;
  } catch {
    checks.DUPLICATE_ORDER_ID_REJECTED = true;
  }

  const invalidSymbolOrderService = {
    async getOrders() {
      return [
        {
          ...order1,
          symbol: 'A APL',
        },
      ];
    },
  } as unknown as AlpacaOrderService;

  const invalidSymbolService =
    new CorporateActionOpenOrderAssociationService(
      effectiveService,
      invalidSymbolOrderService,
    );

  try {
    await invalidSymbolService.associateWithOpenOrders();
    checks.INVALID_ORDER_SYMBOL_REJECTED = false;
  } catch {
    checks.INVALID_ORDER_SYMBOL_REJECTED = true;
  }

  const invalidIdOrderService = {
    async getOrders() {
      return [
        {
          ...order1,
          id: '   ',
        },
      ];
    },
  } as unknown as AlpacaOrderService;

  const invalidIdService =
    new CorporateActionOpenOrderAssociationService(
      effectiveService,
      invalidIdOrderService,
    );

  try {
    await invalidIdService.associateWithOpenOrders();
    checks.INVALID_ORDER_ID_REJECTED = false;
  } catch {
    checks.INVALID_ORDER_ID_REJECTED = true;
  }

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 181 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 181 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 181 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });