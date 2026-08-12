import { detectMissingMarketDataBars } from '../src/market-data/market-data-missing-bars';
import type { AlpacaCalendarDay } from '../src/alpaca/alpaca-calendar.types';
import type { MarketDataBar } from '../src/market-data/market-data.types';

function bar(timestamp: string): MarketDataBar {
  return {
    timestamp: new Date(timestamp),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000,
    tradeCount: 10,
    vwap: 100,
  };
}

const calendar: AlpacaCalendarDay[] = [
  {
    date: '2026-08-11',
    open: '09:30',
    close: '16:00',
    isEarlyClose: false,
  },
  {
    date: '2026-08-12',
    open: '09:30',
    close: '13:00',
    isEarlyClose: true,
  },
];

function main(): void {
  const continuous = detectMissingMarketDataBars(
    [
      bar('2026-08-11T13:30:00Z'),
      bar('2026-08-11T13:31:00Z'),
      bar('2026-08-11T13:32:00Z'),
    ],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `CONTINUOUS_SEQUENCE_ACCEPTED: ${continuous.length === 0}`,
  );

  const oneMissing = detectMissingMarketDataBars(
    [
      bar('2026-08-11T13:30:00Z'),
      bar('2026-08-11T13:32:00Z'),
    ],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `ONE_MISSING_BAR_DETECTED: ${
      oneMissing.length === 1 &&
      oneMissing[0]?.missingCount === 1
    }`,
  );

  const multipleMissing = detectMissingMarketDataBars(
    [
      bar('2026-08-11T13:30:00Z'),
      bar('2026-08-11T13:35:00Z'),
    ],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `MULTIPLE_MISSING_BARS_DETECTED: ${
      multipleMissing.length === 1 &&
      multipleMissing[0]?.missingCount === 4
    }`,
  );

  const fiveMinute = detectMissingMarketDataBars(
    [
      bar('2026-08-11T13:30:00Z'),
      bar('2026-08-11T13:40:00Z'),
    ],
    {
      amount: 5,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `FIVE_MINUTE_GAP_DETECTED: ${
      fiveMinute.length === 1 &&
      fiveMinute[0]?.missingCount === 1
    }`,
  );

  const hourGap = detectMissingMarketDataBars(
    [
      bar('2026-08-11T14:00:00Z'),
      bar('2026-08-11T16:00:00Z'),
    ],
    {
      amount: 1,
      unit: 'Hour',
    },
    calendar,
  );

  console.log(
    `HOURLY_GAP_DETECTED: ${
      hourGap.length === 1 &&
      hourGap[0]?.missingCount === 1
    }`,
  );

  const overnight = detectMissingMarketDataBars(
    [
      bar('2026-08-11T19:59:00Z'),
      bar('2026-08-12T13:30:00Z'),
    ],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `OVERNIGHT_NOT_MARKED_MISSING: ${overnight.length === 0}`,
  );

  const earlyClose = detectMissingMarketDataBars(
    [
      bar('2026-08-12T16:59:00Z'),
      bar('2026-08-12T18:00:00Z'),
    ],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `EARLY_CLOSE_NOT_MARKED_MISSING: ${earlyClose.length === 0}`,
  );

  const unsupportedDaily = detectMissingMarketDataBars(
    [
      bar('2026-08-11T13:30:00Z'),
      bar('2026-08-12T13:30:00Z'),
    ],
    {
      amount: 1,
      unit: 'Day',
    },
    calendar,
  );

  console.log(
    `DAILY_NOT_FALSELY_INFERRED: ${unsupportedDaily.length === 0}`,
  );

  const single = detectMissingMarketDataBars(
    [bar('2026-08-11T13:30:00Z')],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `SINGLE_BAR_ACCEPTED: ${single.length === 0}`,
  );

  const empty = detectMissingMarketDataBars(
    [],
    {
      amount: 1,
      unit: 'Min',
    },
    calendar,
  );

  console.log(
    `EMPTY_SEQUENCE_ACCEPTED: ${empty.length === 0}`,
  );
}

main();