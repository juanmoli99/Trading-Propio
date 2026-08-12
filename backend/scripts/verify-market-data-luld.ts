import { ConfigService } from '@nestjs/config';
import { MarketDataTradingStatusService } from '../src/market-data/market-data-trading-status.service';

const service = new MarketDataTradingStatusService(
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

const firstReceivedAt = new Date('2026-08-12T20:00:01.000Z');

const first = service.ingestLuldForVerification(
  {
    T: 'l',
    S: 'AAPL',
    u: 210.5,
    d: 190.25,
    i: 'B',
    t: '2026-08-12T20:00:00.000Z',
    z: 'C',
  },
  'sip',
  firstReceivedAt,
);

const firstSnapshot = service.getLuldStatus('aapl');

service.ingestLuldForVerification(
  {
    T: 'l',
    S: 'AAPL',
    u: 211.0,
    d: 191.0,
    i: 'B',
    t: '2026-08-12T20:05:00.000Z',
    z: 'C',
  },
  'sip',
  new Date('2026-08-12T20:05:01.000Z'),
);

service.ingestLuldForVerification(
  {
    T: 'l',
    S: 'AAPL',
    u: 999.0,
    d: 1.0,
    i: 'OLD',
    t: '2026-08-12T20:04:59.000Z',
    z: 'C',
  },
  'sip',
  new Date('2026-08-12T20:06:00.000Z'),
);

const finalSnapshot = service.getLuldStatus('AAPL');
const missingSnapshot = service.getLuldStatus('MSFT');

let invalidMessageTypeRejected = false;

try {
  service.ingestLuldForVerification(
    {
      T: 's',
      S: 'AAPL',
      u: 210,
      d: 190,
      i: 'B',
      t: '2026-08-12T20:00:00.000Z',
      z: 'C',
    },
    'sip',
  );
} catch {
  invalidMessageTypeRejected = true;
}

let invalidBandsRejected = false;

try {
  service.ingestLuldForVerification(
    {
      T: 'l',
      S: 'AAPL',
      u: 190,
      d: 200,
      i: 'B',
      t: '2026-08-12T20:00:00.000Z',
      z: 'C',
    },
    'sip',
  );
} catch {
  invalidBandsRejected = true;
}

const assertions = {
  LULD_NORMALIZED:
    first.symbol === 'AAPL' &&
    first.limitUp === 210.5 &&
    first.limitDown === 190.25 &&
    first.indicator === 'B' &&
    first.feed === 'sip',

  LULD_TIMESTAMP_NORMALIZED:
    first.timestamp.toISOString() === '2026-08-12T20:00:00.000Z',

  LULD_RECEIVED_AT_PRESERVED:
    first.receivedAt.toISOString() === firstReceivedAt.toISOString(),

  SYMBOL_LOOKUP_NORMALIZED:
    firstSnapshot.symbol === 'AAPL' &&
    firstSnapshot.luld?.limitUp === 210.5,

  NEWER_LULD_ACCEPTED:
    finalSnapshot.luld?.limitUp === 211.0 &&
    finalSnapshot.luld?.limitDown === 191.0,

  OLDER_LULD_DOES_NOT_OVERWRITE:
    finalSnapshot.luld?.indicator === 'B' &&
    finalSnapshot.luld?.timestamp.toISOString() ===
      '2026-08-12T20:05:00.000Z',

  UNKNOWN_SYMBOL_RETURNS_NULL:
    missingSnapshot.symbol === 'MSFT' &&
    missingSnapshot.luld === null,

  INVALID_MESSAGE_TYPE_REJECTED:
    invalidMessageTypeRejected,

  INVALID_BANDS_REJECTED:
    invalidBandsRejected,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 160 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 160 VERIFICADO CORRECTAMENTE.');