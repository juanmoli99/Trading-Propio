import { ConfigService } from '@nestjs/config';
import type { AlpacaSubmitOrderRequest } from '../src/alpaca/alpaca-submit-order.types';
import { AlpacaSubmitOrderService } from '../src/alpaca/alpaca-submit-order.service';
import { MarketDataHaltDetectionService } from '../src/market-data/market-data-halt-detection.service';
import { MarketDataTradingStatusService } from '../src/market-data/market-data-trading-status.service';

async function main(): Promise<void> {
  const tradingStatusService = new MarketDataTradingStatusService(
    new ConfigService({
      app: {
        tradingMode: 'PAPER',
      },
      alpaca: {
        paper: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      },
    }),
  );

  const haltDetectionService = new MarketDataHaltDetectionService(
    tradingStatusService,
  );

  let httpRequestCount = 0;
  let restrictionValidationCount = 0;

  const httpClient = {
    getTradingMode(): 'PAPER' {
      return 'PAPER';
    },

    async request(): Promise<never> {
      httpRequestCount += 1;
      throw new Error('HTTP_REQUEST_REACHED');
    },
  };

  const ownershipService = {
    async registerPlatformOrder(): Promise<void> {
      return;
    },
  };

  const accountRestrictionGuard = {
    async validateOrder(): Promise<void> {
      restrictionValidationCount += 1;
    },
  };

  const submitOrderService = new AlpacaSubmitOrderService(
    httpClient as never,
    ownershipService as never,
    accountRestrictionGuard as never,
    haltDetectionService,
  );

  const orderRequest: AlpacaSubmitOrderRequest = {
    symbol: 'aapl',
    side: 'buy',
    type: 'market',
    timeInForce: 'day',
    quantity: '1',
    clientOrderId: 'verify-point-161',
  };

  const haltTimestamp = '2026-08-12T20:15:30.123Z';

  tradingStatusService.ingestMessageForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'H',
      sm: 'Trading Halt',
      rc: 'T1',
      rm: 'News Pending',
      t: haltTimestamp,
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:15:31.000Z'),
  );

  let haltedOrderRejected = false;
  let haltReasonPreserved = false;
  let haltTimestampPreserved = false;

  try {
    await submitOrderService.submitOrder(orderRequest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    haltedOrderRejected =
      message.includes('AAPL') &&
      message.includes('halted');

    haltReasonPreserved =
      message.includes('T1') &&
      message.includes('News Pending');

    haltTimestampPreserved =
      message.includes(haltTimestamp);
  }

  const httpRequestsAfterHalt = httpRequestCount;
  const restrictionChecksAfterHalt = restrictionValidationCount;

  tradingStatusService.ingestMessageForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'T',
      sm: 'Trading Resumed',
      rc: '',
      rm: '',
      t: '2026-08-12T20:20:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:20:01.000Z'),
  );

  let resumedOrderReachedHttp = false;

  try {
    await submitOrderService.submitOrder({
      ...orderRequest,
      clientOrderId: 'verify-point-161-resumed',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    resumedOrderReachedHttp =
      message === 'HTTP_REQUEST_REACHED';
  }

  const assertions = {
    HALTED_ORDER_REJECTED:
      haltedOrderRejected,

    HALT_REASON_PRESERVED:
      haltReasonPreserved,

    HALT_TIMESTAMP_PRESERVED:
      haltTimestampPreserved,

    HALTED_ORDER_NEVER_REACHED_HTTP:
      httpRequestsAfterHalt === 0,

    HALTED_ORDER_STOPPED_BEFORE_ACCOUNT_GUARD:
      restrictionChecksAfterHalt === 0,

    RESUMED_ORDER_ALLOWED_TO_CONTINUE:
      resumedOrderReachedHttp,

    RESUMED_ORDER_REACHED_HTTP:
      httpRequestCount === 1,

    RESUMED_ORDER_PASSED_ACCOUNT_GUARD:
      restrictionValidationCount === 1,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  if (!Object.values(assertions).every(Boolean)) {
    console.error('PUNTO 161 FALLÓ.');
    process.exit(1);
  }

  console.log('PUNTO 161 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});