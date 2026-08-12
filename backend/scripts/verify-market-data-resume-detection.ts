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

const beforeResume =
  haltDetectionService.detectResume('AAPL');

ingest('AAPL', 'T', 'C', '2026-08-12T20:01:00.000Z');

const afterResume =
  haltDetectionService.detectResume('AAPL');

ingest('MSFT', 'T', 'C', '2026-08-12T20:00:00.000Z');

const noPreviousHalt =
  haltDetectionService.detectResume('MSFT');

ingest('NVDA', 'H', 'C', '2026-08-12T20:00:00.000Z');
ingest('NVDA', 'P', 'C', '2026-08-12T20:01:00.000Z');

const haltToHalt =
  haltDetectionService.detectResume('NVDA');

ingest('AMD', 'H', 'C', '2026-08-12T20:00:00.000Z');
ingest('AMD', 'ZZZ', 'C', '2026-08-12T20:01:00.000Z');

const haltToUnknown =
  haltDetectionService.detectResume('AMD');

ingest('META', 'H', 'C', '2026-08-12T20:00:00.000Z');
ingest('META', 'T', 'C', '2026-08-12T20:02:00.000Z');

tradingStatusService.ingestMessageForVerification(
  {
    T: 's',
    S: 'META',
    sc: 'H',
    sm: '',
    rc: '',
    rm: '',
    t: '2026-08-12T20:01:00.000Z',
    z: 'C',
  },
  'sip',
  new Date('2026-08-12T20:03:00.000Z'),
);

const staleMessageIgnored =
  haltDetectionService.detectResume('META');

const assertions = {
  HALT_ALONE_IS_NOT_RESUME:
    beforeResume.resumed === false &&
    beforeResume.currentState === 'HALTED',

  HALT_TO_RESUME_DETECTED:
    afterResume.resumed === true,

  PREVIOUS_STATE_WAS_HALTED:
    afterResume.previousState === 'HALTED',

  CURRENT_STATE_IS_NOT_HALTED:
    afterResume.currentState === 'NOT_HALTED',

  PREVIOUS_STATUS_PRESERVED:
    afterResume.previousStatus?.statusCode === 'H',

  CURRENT_STATUS_PRESERVED:
    afterResume.currentStatus?.statusCode === 'T',

  FIRST_NON_HALTED_STATUS_IS_NOT_RESUME:
    noPreviousHalt.resumed === false &&
    noPreviousHalt.previousState === 'UNKNOWN' &&
    noPreviousHalt.currentState === 'NOT_HALTED',

  HALT_TO_HALT_IS_NOT_RESUME:
    haltToHalt.resumed === false &&
    haltToHalt.previousState === 'HALTED' &&
    haltToHalt.currentState === 'HALTED',

  HALT_TO_UNKNOWN_IS_NOT_RESUME:
    haltToUnknown.resumed === false &&
    haltToUnknown.previousState === 'HALTED' &&
    haltToUnknown.currentState === 'UNKNOWN',

  STALE_STATUS_DOES_NOT_DESTROY_RESUME:
    staleMessageIgnored.resumed === true &&
    staleMessageIgnored.previousStatus?.statusCode === 'H' &&
    staleMessageIgnored.currentStatus?.statusCode === 'T',

  IS_RESUME_DETECTED_RETURNS_TRUE:
    haltDetectionService.isResumeDetected('AAPL') === true,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 159 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 159 VERIFICADO CORRECTAMENTE.');
