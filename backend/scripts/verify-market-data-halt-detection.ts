import { ConfigService } from '@nestjs/config';
import { MarketDataHaltDetectionService } from '../src/market-data/market-data-halt-detection.service';
import { MarketDataTradingStatusService } from '../src/market-data/market-data-trading-status.service';

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

function ingest(
  symbol: string,
  statusCode: string,
  tape: string,
  timestamp: string,
): void {
  tradingStatusService.ingestMessageForVerification(
    {
      T: 's',
      S: symbol,
      sc: statusCode,
      sm: '',
      rc: '',
      rm: '',
      t: timestamp,
      z: tape,
    },
    'sip',
    new Date(timestamp),
  );
}

ingest('AAPL', 'H', 'C', '2026-08-12T20:00:00.000Z');

const utpHalt = haltDetectionService.detect('AAPL');

ingest('AAPL', 'T', 'C', '2026-08-12T20:01:00.000Z');

const utpResume = haltDetectionService.detect('AAPL');

ingest('MSFT', '2', 'A', '2026-08-12T20:00:00.000Z');

const ctaHalt = haltDetectionService.detect('MSFT');

ingest('MSFT', '3', 'A', '2026-08-12T20:01:00.000Z');

const ctaResume = haltDetectionService.detect('MSFT');

ingest('NVDA', 'P', 'C', '2026-08-12T20:00:00.000Z');

const volatilityPause = haltDetectionService.detect('NVDA');

ingest('AMD', 'ZZZ', 'C', '2026-08-12T20:00:00.000Z');

const unknownCode = haltDetectionService.detect('AMD');

const missing = haltDetectionService.detect('TSLA');

let haltedRejected = false;

try {
  ingest('META', 'H', 'C', '2026-08-12T20:00:00.000Z');
  haltDetectionService.assertKnownAndNotHalted('META');
} catch {
  haltedRejected = true;
}

let unknownRejected = false;

try {
  haltDetectionService.assertKnownAndNotHalted('TSLA');
} catch {
  unknownRejected = true;
}

let resumedAllowed = true;

try {
  haltDetectionService.assertKnownAndNotHalted('AAPL');
} catch {
  resumedAllowed = false;
}

const assertions = {
  UTP_HALT_DETECTED:
    utpHalt.state === 'HALTED' &&
    utpHalt.halted === true,

  UTP_RESUME_DETECTED:
    utpResume.state === 'NOT_HALTED' &&
    utpResume.halted === false,

  CTA_HALT_DETECTED:
    ctaHalt.state === 'HALTED' &&
    ctaHalt.halted === true,

  CTA_RESUME_DETECTED:
    ctaResume.state === 'NOT_HALTED' &&
    ctaResume.halted === false,

  VOLATILITY_PAUSE_DETECTED:
    volatilityPause.state === 'HALTED' &&
    volatilityPause.halted === true,

  UNKNOWN_CODE_FAILS_CLOSED:
    unknownCode.state === 'UNKNOWN' &&
    unknownCode.halted === false,

  MISSING_STATUS_IS_UNKNOWN:
    missing.state === 'UNKNOWN' &&
    missing.status === null,

  HALTED_SYMBOL_REJECTED:
    haltedRejected,

  UNKNOWN_SYMBOL_REJECTED:
    unknownRejected,

  RESUMED_SYMBOL_ALLOWED:
    resumedAllowed,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 156 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 156 VERIFICADO CORRECTAMENTE.');