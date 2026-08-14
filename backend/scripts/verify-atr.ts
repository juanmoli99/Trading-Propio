import { AtrService } from '../src/indicators/atr.service';
import type { MarketDataBar } from '../src/market-data/market-data.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function approximatelyEqual(
  actual: number,
  expected: number,
  tolerance = 1e-10,
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function bar(
  high: number,
  low: number,
  close: number,
  index: number,
): MarketDataBar {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, index)),
    open: close,
    high,
    low,
    close,
    volume: 1000,
    tradeCount: 10,
    vwap: close,
  };
}

function main(): void {
  const service = new AtrService();

  const basicBars = [
    bar(10, 8, 9, 0),
    bar(12, 9, 11, 1),
    bar(14, 10, 13, 2),
    bar(15, 12, 14, 3),
  ];

  const basic = service.calculate({
    bars: basicBars,
    period: 3,
  });

  check('PERIOD_PRESERVED', basic.period === 3);

  check('LAST_TRUE_RANGE_CORRECT', approximatelyEqual(basic.trueRange, 3));

  check('INITIAL_ATR_CORRECT', approximatelyEqual(basic.value, 10 / 3));

  const gapBars = [bar(100, 95, 98, 0), bar(110, 108, 109, 1)];

  const gap = service.calculate({
    bars: gapBars,
    period: 1,
  });

  check(
    'GAP_TRUE_RANGE_USES_PREVIOUS_CLOSE',
    approximatelyEqual(gap.trueRange, 12),
  );

  check('PERIOD_ONE_ATR_EQUALS_TRUE_RANGE', approximatelyEqual(gap.value, 12));

  const downwardGapBars = [bar(100, 95, 97, 0), bar(90, 88, 89, 1)];

  const downwardGap = service.calculate({
    bars: downwardGapBars,
    period: 1,
  });

  check(
    'DOWNWARD_GAP_TRUE_RANGE_CORRECT',
    approximatelyEqual(downwardGap.trueRange, 9),
  );

  const smoothedBars = [
    bar(10, 8, 9, 0),
    bar(12, 9, 11, 1),
    bar(14, 10, 13, 2),
    bar(15, 12, 14, 3),
    bar(18, 14, 17, 4),
  ];

  const smoothed = service.calculate({
    bars: smoothedBars,
    period: 3,
  });

  check('WILDER_SMOOTHING_CORRECT', approximatelyEqual(smoothed.value, 32 / 9));

  check(
    'SMOOTHED_LAST_TRUE_RANGE_CORRECT',
    approximatelyEqual(smoothed.trueRange, 4),
  );

  const flatBars = [bar(100, 100, 100, 0), bar(100, 100, 100, 1)];

  const flat = service.calculate({
    bars: flatBars,
    period: 1,
  });

  check('ZERO_TRUE_RANGE_SUPPORTED', flat.trueRange === 0);

  check('ZERO_ATR_SUPPORTED', flat.value === 0);

  const originalBars = [bar(10, 8, 9, 0), bar(12, 9, 11, 1)];

  const snapshot = originalBars.map((item) => ({
    high: item.high,
    low: item.low,
    close: item.close,
    timestamp: item.timestamp.getTime(),
  }));

  service.calculate({
    bars: originalBars,
    period: 1,
  });

  check(
    'INPUT_BARS_NOT_MUTATED',
    originalBars.every(
      (item, index) =>
        item.high === snapshot[index]?.high &&
        item.low === snapshot[index]?.low &&
        item.close === snapshot[index]?.close &&
        item.timestamp.getTime() === snapshot[index]?.timestamp,
    ),
  );

  expectThrow('EMPTY_BARS_REJECTED', () =>
    service.calculate({
      bars: [],
      period: 1,
    }),
  );

  expectThrow('INSUFFICIENT_BARS_REJECTED', () =>
    service.calculate({
      bars: [bar(10, 8, 9, 0)],
      period: 1,
    }),
  );

  for (const invalidPeriod of [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_PERIOD_REJECTED_${String(invalidPeriod)}`, () =>
      service.calculate({
        bars: basicBars,
        period: invalidPeriod,
      }),
    );
  }

  expectThrow('NON_FINITE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(10, 8, 9, 0), bar(Number.NaN, 8, 9, 1)],
      period: 1,
    }),
  );

  expectThrow('NON_FINITE_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(10, 8, 9, 0), bar(10, Number.POSITIVE_INFINITY, 9, 1)],
      period: 1,
    }),
  );

  expectThrow('NON_FINITE_CLOSE_REJECTED', () =>
    service.calculate({
      bars: [bar(10, 8, 9, 0), bar(10, 8, Number.NaN, 1)],
      period: 1,
    }),
  );

  expectThrow('NON_POSITIVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(10, 8, 9, 0), bar(0, 0, 0, 1)],
      period: 1,
    }),
  );

  expectThrow('HIGH_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [
        bar(10, 8, 9, 0),
        {
          ...bar(10, 8, 9, 1),
          high: 7,
          low: 8,
        },
      ],
      period: 1,
    }),
  );

  expectThrow('CLOSE_ABOVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [
        bar(10, 8, 9, 0),
        {
          ...bar(10, 8, 9, 1),
          close: 11,
        },
      ],
      period: 1,
    }),
  );

  expectThrow('CLOSE_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [
        bar(10, 8, 9, 0),
        {
          ...bar(10, 8, 9, 1),
          close: 7,
        },
      ],
      period: 1,
    }),
  );
  const extremeFinite = service.calculate({
    bars: [
      bar(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, 0),
      bar(Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, 1),
    ],
    period: 1,
  });

  check(
    'EXTREME_FINITE_TRUE_RANGE_SUPPORTED',
    Number.isFinite(extremeFinite.trueRange),
  );

  check('EXTREME_FINITE_ATR_SUPPORTED', Number.isFinite(extremeFinite.value));
  const deterministicInput = {
    bars: smoothedBars,
    period: 3,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.period === second.period &&
      first.trueRange === second.trueRange,
  );

  check('FINAL_ATR_FINITE', Number.isFinite(first.value));

  check('FINAL_ATR_NON_NEGATIVE', first.value >= 0);

  console.log('PUNTO 219 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

