const assert = require('node:assert/strict');

const { AlpacaHaltOpenOrderService } = require('../dist/src/alpaca/alpaca-halt-open-order.service.js');

async function main() {
  const haltedAt = new Date('2026-08-12T20:15:30.123Z');

  const haltDetectionService = {
    detect(symbol) {
      return {
        symbol: symbol.trim().toUpperCase(),
        state: 'HALTED',
        halted: true,
        haltedAt,
        haltReason: {
          code: 'T1',
          message: 'News Pending',
        },
        status: null,
      };
    },
  };

  let capturedOptions = null;

  const orderService = {
    async getOrders(options) {
      capturedOptions = options;

      return [
        {
          id: 'order-1',
          clientOrderId: 'platform-order-1',
          symbol: 'AAPL',
          assetId: null,
          assetClass: 'us_equity',
          side: 'buy',
          type: 'limit',
          timeInForce: 'day',
          status: 'new',
          quantity: '10',
          notional: null,
          filledQuantity: '0',
          filledAveragePrice: null,
          limitPrice: '200',
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
        {
          id: 'order-2',
          clientOrderId: 'platform-order-2',
          symbol: 'AAPL',
          assetId: null,
          assetClass: 'us_equity',
          side: 'sell',
          type: 'limit',
          timeInForce: 'gtc',
          status: 'partially_filled',
          quantity: '5',
          notional: null,
          filledQuantity: '2',
          filledAveragePrice: '201',
          limitPrice: '205',
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
        {
          id: 'other-symbol',
          clientOrderId: 'other-symbol-order',
          symbol: 'MSFT',
          assetId: null,
          assetClass: 'us_equity',
          side: 'buy',
          type: 'market',
          timeInForce: 'day',
          status: 'new',
          quantity: '1',
          notional: null,
          filledQuantity: '0',
          filledAveragePrice: null,
          limitPrice: null,
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
      ];
    },
  };

  const service = new AlpacaHaltOpenOrderService(
    orderService,
    haltDetectionService,
  );

  const result = await service.inspect('aapl');

  const assertions = {
    HALTED_SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    REVIEW_REQUIRED_DETECTED:
      result.state === 'REVIEW_REQUIRED',

    HALT_TIMESTAMP_PRESERVED:
      result.haltedAt instanceof Date &&
      result.haltedAt.toISOString() === haltedAt.toISOString(),

    HALT_REASON_PRESERVED:
      result.haltReason?.code === 'T1' &&
      result.haltReason?.message === 'News Pending',

    ONLY_AFFECTED_SYMBOL_ORDERS_INCLUDED:
      result.openOrders.length === 2 &&
      result.openOrders.every((order) => order.symbol === 'AAPL'),

    OPEN_ORDERS_REQUEST_SCOPED:
      capturedOptions?.status === 'open' &&
      capturedOptions?.symbols === 'AAPL' &&
      capturedOptions?.nested === true,

    CANCELABLE_STATUS_DETECTED:
      result.openOrders[0]?.cancelable === true &&
      result.openOrders[1]?.cancelable === true,

    PARTIAL_FILL_PRESERVED:
      result.openOrders[1]?.filledQuantity === '2',

    NO_AUTOMATIC_ACTION_ON_ORDERS:
      result.openOrders.every(
        (order) => order.automaticActionTaken === false,
      ),

    NO_AUTOMATIC_GLOBAL_ACTION:
      result.automaticActionTaken === false,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o mÃ¡s verificaciones del punto 162 fallaron',
  );

  console.log('PUNTO 162 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});