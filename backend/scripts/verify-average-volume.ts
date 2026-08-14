import { AverageVolumeService } from '../src/indicators/average-volume.service';
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

function bar(volume: number, index: number): MarketDataBar {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 14, 30 + index)),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume,
    tradeCount: 1,
    vwap: 100,
  };
}

function main(): void {
  const service = new AverageVolumeService();

  const basicBars = [
    bar(100, 0),
    bar(200, 1),
    bar(300, 2),
    bar(400, 3),
    bar(500, 4),
  ];

  const basic = service.calculate({
    bars: basicBars,
    period: 5,
  });

  check('BASIC_AVERAGE_CORRECT', basic.value === 300);
  check('PERIOD_PRESERVED', basic.period === 5);
  check('TOTAL_VOLUME_CORRECT', basic.totalVolume === 1500);

  const trailing = service.calculate({
    bars: basicBars,
    period: 3,
  });

  check('ONLY_TRAILING_PERIOD_USED', trailing.value === 400);
  check('TRAILING_TOTAL_CORRECT', trailing.totalVolume === 1200);

  const exactPeriod = service.calculate({
    bars: [bar(10, 0), bar(20, 1), bar(30, 2)],
    period: 3,
  });

  check('EXACT_PERIOD_LENGTH_CORRECT', exactPeriod.value === 20);

  const periodOne = service.calculate({
    bars: basicBars,
    period: 1,
  });

  check('PERIOD_ONE_RETURNS_LAST_VOLUME', periodOne.value === 500);
  check('PERIOD_ONE_TOTAL_CORRECT', periodOne.totalVolume === 500);

  const zeroVolumes = service.calculate({
    bars: [bar(0, 0), bar(0, 1), bar(0, 2)],
    period: 3,
  });

  check('ZERO_VOLUME_SUPPORTED', zeroVolumes.value === 0);
  check('ZERO_TOTAL_SUPPORTED', zeroVolumes.totalVolume === 0);

  const mixedZero = service.calculate({
    bars: [bar(0, 0), bar(100, 1), bar(200, 2)],
    period: 3,
  });

  check('MIXED_ZERO_VOLUME_CORRECT', mixedZero.value === 100);
  check('MIXED_ZERO_TOTAL_CORRECT', mixedZero.totalVolume === 300);

  const snapshot = basicBars.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));

  service.calculate({
    bars: basicBars,
    period: 3,
  });

  check(
    'INPUT_BARS_NOT_MUTATED',
    basicBars.length === snapshot.length &&
      basicBars.every((item, index) => {
        const original = snapshot[index];

        return (
          original !== undefined &&
          item.volume === original.volume &&
          item.open === original.open &&
          item.high === original.high &&
          item.low === original.low &&
          item.close === original.close &&
          item.tradeCount === original.tradeCount &&
          item.vwap === original.vwap &&
          item.timestamp.getTime() === original.timestamp.getTime()
        );
      }),
  );

  expectThrow('EMPTY_BARS_REJECTED', () =>
    service.calculate({
      bars: [],
      period: 1,
    }),
  );

  expectThrow('INSUFFICIENT_BARS_REJECTED', () =>
    service.calculate({
      bars: [bar(100, 0), bar(200, 1)],
      period: 3,
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

  for (const invalidVolume of [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    expectThrow(`INVALID_VOLUME_REJECTED_${String(invalidVolume)}`, () =>
      service.calculate({
        bars: [bar(invalidVolume, 0), bar(100, 1), bar(200, 2)],
        period: 3,
      }),
    );
  }

  expectThrow('TOTAL_VOLUME_OVERFLOW_REJECTED', () =>
    service.calculate({
      bars: [bar(Number.MAX_SAFE_INTEGER, 0), bar(1, 1)],
      period: 2,
    }),
  );

  const safeLargeVolume = Math.floor(Number.MAX_SAFE_INTEGER / 4);

  const safeLarge = service.calculate({
    bars: [
      bar(safeLargeVolume, 0),
      bar(safeLargeVolume, 1),
      bar(safeLargeVolume, 2),
    ],
    period: 3,
  });

  check(
    'LARGE_SAFE_VOLUME_SUPPORTED',
    Number.isFinite(safeLarge.value) &&
      Number.isSafeInteger(safeLarge.totalVolume),
  );

  const deterministicInput = {
    bars: [
      bar(1250, 0),
      bar(1750, 1),
      bar(2500, 2),
      bar(3250, 3),
      bar(4000, 4),
    ],
    period: 4,
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.period === second.period &&
      first.totalVolume === second.totalVolume,
  );

  check('FINAL_AVERAGE_FINITE', Number.isFinite(first.value));
  check('FINAL_AVERAGE_NON_NEGATIVE', first.value >= 0);
  check('FINAL_TOTAL_SAFE_INTEGER', Number.isSafeInteger(first.totalVolume));

  console.log('PUNTO 224 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

