import { AdxService } from '../src/indicators/adx.service';
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

function bar(
  high: number,
  low: number,
  close: number,
  index: number,
): MarketDataBar {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 14, 30 + index)),
    open: close,
    high,
    low,
    close,
    volume: 1000,
    tradeCount: 100,
    vwap: close,
  };
}

function main(): void {
  const service = new AdxService();

  const trendingBars = Array.from({ length: 12 }, (_, index) => {
    const base = 100 + index * 2;

    return bar(base + 2, base, base + 1, index);
  });

  const trending = service.calculate({
    bars: trendingBars,
    period: 5,
  });

  check('PERIOD_PRESERVED', trending.period === 5);

  check('ADX_FINITE', Number.isFinite(trending.adx));

  check('PLUS_DI_FINITE', Number.isFinite(trending.plusDi));

  check('MINUS_DI_FINITE', Number.isFinite(trending.minusDi));

  check('DX_FINITE', Number.isFinite(trending.dx));

  check('ADX_BOUNDED', trending.adx >= 0 && trending.adx <= 100);

  check('DX_BOUNDED', trending.dx >= 0 && trending.dx <= 100);

  check('UPTREND_PLUS_DI_DOMINATES', trending.plusDi > trending.minusDi);

  check('UPTREND_DX_100', trending.dx === 100);

  check('UPTREND_ADX_100', trending.adx === 100);

  const downtrendBars = Array.from({ length: 12 }, (_, index) => {
    const base = 150 - index * 2;

    return bar(base + 2, base, base + 1, index);
  });

  const downtrend = service.calculate({
    bars: downtrendBars,
    period: 5,
  });

  check('DOWNTREND_MINUS_DI_DOMINATES', downtrend.minusDi > downtrend.plusDi);

  check('DOWNTREND_DX_100', downtrend.dx === 100);

  check('DOWNTREND_ADX_100', downtrend.adx === 100);

  const flatBars = Array.from({ length: 12 }, (_, index) =>
    bar(100, 100, 100, index),
  );

  const flat = service.calculate({
    bars: flatBars,
    period: 5,
  });

  check('FLAT_PLUS_DI_ZERO', flat.plusDi === 0);

  check('FLAT_MINUS_DI_ZERO', flat.minusDi === 0);

  check('FLAT_DX_ZERO', flat.dx === 0);

  check('FLAT_ADX_ZERO', flat.adx === 0);

  const periodOneBars = [
    bar(102, 100, 101, 0),
    bar(104, 102, 103, 1),
    bar(106, 104, 105, 2),
  ];

  const periodOne = service.calculate({
    bars: periodOneBars,
    period: 1,
  });

  check('PERIOD_ONE_SUPPORTED', periodOne.period === 1);

  check('PERIOD_ONE_ADX_FINITE', Number.isFinite(periodOne.adx));

  const minimumBars = Array.from({ length: 11 }, (_, index) => {
    const base = 100 + index;

    return bar(base + 2, base, base + 1, index);
  });

  const minimumResult = service.calculate({
    bars: minimumBars,
    period: 5,
  });

  check('MINIMUM_WARMUP_ACCEPTED', Number.isFinite(minimumResult.adx));

  expectThrow('INSUFFICIENT_WARMUP_REJECTED', () =>
    service.calculate({
      bars: minimumBars.slice(0, 10),
      period: 5,
    }),
  );

  const snapshot = trendingBars.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));

  service.calculate({
    bars: trendingBars,
    period: 5,
  });

  check(
    'INPUT_BARS_NOT_MUTATED',
    trendingBars.length === snapshot.length &&
      trendingBars.every((item, index) => {
        const original = snapshot[index];

        return (
          original !== undefined &&
          item.open === original.open &&
          item.high === original.high &&
          item.low === original.low &&
          item.close === original.close &&
          item.volume === original.volume &&
          item.tradeCount === original.tradeCount &&
          item.vwap === original.vwap &&
          item.timestamp.getTime() === original.timestamp.getTime()
        );
      }),
  );

  expectThrow('EMPTY_BARS_REJECTED', () =>
    service.calculate({
      bars: [],
      period: 5,
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
        bars: trendingBars,
        period: invalidPeriod,
      }),
    );
  }

  for (const invalid of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_HIGH_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(invalid, 100, 100, 0), ...trendingBars.slice(1)],
        period: 5,
      }),
    );

    expectThrow(`INVALID_LOW_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(102, invalid, 101, 0), ...trendingBars.slice(1)],
        period: 5,
      }),
    );

    expectThrow(`INVALID_CLOSE_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(102, 100, invalid, 0), ...trendingBars.slice(1)],
        period: 5,
      }),
    );
  }

  expectThrow('NON_POSITIVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(0, 0, 0, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  expectThrow('NON_POSITIVE_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(102, 0, 101, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  expectThrow('NON_POSITIVE_CLOSE_REJECTED', () =>
    service.calculate({
      bars: [bar(102, 100, 0, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  expectThrow('HIGH_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(100, 102, 101, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  expectThrow('CLOSE_ABOVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(102, 100, 103, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  expectThrow('CLOSE_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(102, 100, 99, 0), ...trendingBars.slice(1)],
      period: 5,
    }),
  );

  const deterministicBars = [
    bar(102, 99, 101, 0),
    bar(104, 100, 103, 1),
    bar(105, 101, 102, 2),
    bar(107, 103, 106, 3),
    bar(108, 104, 105, 4),
    bar(110, 106, 109, 5),
    bar(109, 105, 106, 6),
    bar(111, 107, 110, 7),
    bar(113, 108, 112, 8),
    bar(112, 107, 108, 9),
    bar(114, 109, 113, 10),
    bar(116, 111, 115, 11),
  ];

  const first = service.calculate({
    bars: deterministicBars,
    period: 5,
  });

  const second = service.calculate({
    bars: deterministicBars,
    period: 5,
  });

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.adx === second.adx &&
      first.plusDi === second.plusDi &&
      first.minusDi === second.minusDi &&
      first.dx === second.dx &&
      first.period === second.period,
  );

  check('FINAL_ADX_FINITE', Number.isFinite(first.adx));

  check('FINAL_ADX_BOUNDED', first.adx >= 0 && first.adx <= 100);

  check('FINAL_DX_BOUNDED', first.dx >= 0 && first.dx <= 100);

  check(
    'FINAL_DIRECTIONAL_INDEXES_NON_NEGATIVE',
    first.plusDi >= 0 && first.minusDi >= 0,
  );

  console.log('PUNTO 223 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
