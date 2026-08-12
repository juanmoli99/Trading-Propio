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
  new Date('2026-08-12T20:15:35.000Z'),
);

const halted = haltDetectionService.detect('aapl');
const haltedAt = haltDetectionService.getHaltedAt('AAPL');

tradingStatusService.ingestMessageForVerification(
  {
    T: 's',
    S: 'MSFT',
    sc: 'T',
    sm: 'Trading Resumed',
    rc: '',
    rm: '',
    t: '2026-08-12T20:20:00.000Z',
    z: 'C',
  },
  'sip',
);

const resumed = haltDetectionService.detect('MSFT');
const unknown = haltDetectionService.detect('NVDA');

const firstReturnedTimestamp = haltDetectionService.getHaltedAt('AAPL');

if (firstReturnedTimestamp !== null) {
  firstReturnedTimestamp.setUTCFullYear(2000);
}

const secondReturnedTimestamp = haltDetectionService.getHaltedAt('AAPL');

const assertions = {
  HALT_TIMESTAMP_REGISTERED:
    halted.haltedAt instanceof Date,

  HALT_TIMESTAMP_MATCHES_FEED_EVENT:
    halted.haltedAt?.toISOString() === haltTimestamp,

  HALT_TIMESTAMP_NOT_RECEIVED_AT:
    halted.haltedAt?.toISOString() !==
    halted.status?.receivedAt.toISOString(),

  GET_HALTED_AT_RETURNS_TIMESTAMP:
    haltedAt?.toISOString() === haltTimestamp,

  HALT_TIMESTAMP_DEFENSIVELY_COPIED:
    secondReturnedTimestamp?.toISOString() === haltTimestamp,

  NON_HALTED_HAS_NO_HALT_TIMESTAMP:
    resumed.state === 'NOT_HALTED' &&
    resumed.haltedAt === null,

  UNKNOWN_HAS_NO_HALT_TIMESTAMP:
    unknown.state === 'UNKNOWN' &&
    unknown.haltedAt === null,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 158 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 158 VERIFICADO CORRECTAMENTE.');