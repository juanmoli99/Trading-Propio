import { ConfigService } from '@nestjs/config';
import { MarketDataTradingStatusService } from '../src/market-data/market-data-trading-status.service';
import { MarketDataHaltDetectionService } from '../src/market-data/market-data-halt-detection.service';

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

tradingStatusService.ingestMessageForVerification(
  {
    T: 's',
    S: 'AAPL',
    sc: 'H',
    sm: 'Trading Halt',
    rc: 'T1',
    rm: 'News Pending',
    t: '2026-08-12T20:00:00.000Z',
    z: 'C',
  },
  'sip',
);

const halted = haltDetectionService.detect('aapl');
const haltReason = haltDetectionService.getHaltReason('AAPL');

let haltError = '';

try {
  haltDetectionService.assertKnownAndNotHalted('AAPL');
} catch (error) {
  haltError = error instanceof Error ? error.message : String(error);
}

tradingStatusService.ingestMessageForVerification(
  {
    T: 's',
    S: 'MSFT',
    sc: 'T',
    sm: 'Trading Resumed',
    rc: '',
    rm: '',
    t: '2026-08-12T20:01:00.000Z',
    z: 'C',
  },
  'sip',
);

const resumed = haltDetectionService.detect('MSFT');

const unknown = haltDetectionService.detect('NVDA');

const assertions = {
  HALT_REASON_REGISTERED:
    halted.haltReason !== null,

  HALT_REASON_CODE_PRESERVED:
    halted.haltReason?.code === 'T1',

  HALT_REASON_MESSAGE_PRESERVED:
    halted.haltReason?.message === 'News Pending',

  GET_HALT_REASON_RETURNS_REASON:
    haltReason?.code === 'T1' &&
    haltReason.message === 'News Pending',

  HALT_ERROR_INCLUDES_REASON:
    haltError.includes('T1') &&
    haltError.includes('News Pending'),

  NON_HALTED_HAS_NO_HALT_REASON:
    resumed.state === 'NOT_HALTED' &&
    resumed.haltReason === null,

  UNKNOWN_HAS_NO_HALT_REASON:
    unknown.state === 'UNKNOWN' &&
    unknown.haltReason === null,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 157 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 157 VERIFICADO CORRECTAMENTE.');