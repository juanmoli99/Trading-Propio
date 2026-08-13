import { VwapService } from '../src/indicators/vwap.service';
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
  volume: number,
  index: number,
): MarketDataBar {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 14, 30 + index)),
    open: close,
    high,
    low,
    close,
    volume,
    tradeCount: 1,
    vwap: close,
  };
}

function main(): void {
  const service = new VwapService();

  const basicBars = [bar(12, 8, 10, 100, 0), bar(24, 16, 20, 300, 1)];

  const basicSnapshot = basicBars.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));

  const basic = service.calculate({
    bars: basicBars,
  });

  check('BASIC_VWAP_CORRECT', approximatelyEqual(basic.value, 17.5));

  check('CUMULATIVE_VOLUME_CORRECT', basic.cumulativeVolume === 400);

  check(
    'CUMULATIVE_PRICE_VOLUME_CORRECT',
    approximatelyEqual(basic.cumulativePriceVolume, 7000),
  );

  const single = service.calculate({
    bars: [bar(12, 8, 10, 100, 0)],
  });

  check('SINGLE_BAR_VWAP_CORRECT', approximatelyEqual(single.value, 10));

  const unequalTypicalPrice = service.calculate({
    bars: [bar(15, 9, 12, 200, 0)],
  });

  check(
    'TYPICAL_PRICE_FORMULA_CORRECT',
    approximatelyEqual(unequalTypicalPrice.value, (15 + 9 + 12) / 3),
  );

  const zeroVolumeMixed = service.calculate({
    bars: [bar(100, 90, 95, 0, 0), bar(12, 8, 10, 100, 1)],
  });

  check(
    'ZERO_VOLUME_BAR_DOES_NOT_DISTORT_VWAP',
    approximatelyEqual(zeroVolumeMixed.value, 10),
  );

  check(
    'ZERO_VOLUME_BAR_PRESERVES_TOTAL_VOLUME',
    zeroVolumeMixed.cumulativeVolume === 100,
  );

  expectThrow('ALL_ZERO_VOLUME_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 8, 10, 0, 0), bar(24, 16, 20, 0, 1)],
    }),
  );

  check(
    'INPUT_BARS_NOT_MUTATED',
    basicBars.length === basicSnapshot.length &&
      basicBars.every((item, index) => {
        const original = basicSnapshot[index];

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
    }),
  );

  for (const invalid of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_HIGH_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(invalid, 8, 10, 100, 0)],
      }),
    );

    expectThrow(`INVALID_LOW_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(12, invalid, 10, 100, 0)],
      }),
    );

    expectThrow(`INVALID_CLOSE_REJECTED_${String(invalid)}`, () =>
      service.calculate({
        bars: [bar(12, 8, invalid, 100, 0)],
      }),
    );
  }

  expectThrow('NON_POSITIVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(0, 0, 0, 100, 0)],
    }),
  );

  expectThrow('NON_POSITIVE_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 0, 10, 100, 0)],
    }),
  );

  expectThrow('NON_POSITIVE_CLOSE_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 8, 0, 100, 0)],
    }),
  );

  expectThrow('HIGH_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(8, 12, 10, 100, 0)],
    }),
  );

  expectThrow('CLOSE_ABOVE_HIGH_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 8, 13, 100, 0)],
    }),
  );

  expectThrow('CLOSE_BELOW_LOW_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 8, 7, 100, 0)],
    }),
  );

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
        bars: [bar(12, 8, 10, invalidVolume, 0)],
      }),
    );
  }

  expectThrow('CUMULATIVE_VOLUME_OVERFLOW_REJECTED', () =>
    service.calculate({
      bars: [bar(12, 8, 10, Number.MAX_SAFE_INTEGER, 0), bar(12, 8, 10, 1, 1)],
    }),
  );

  expectThrow('PRICE_VOLUME_OVERFLOW_REJECTED', () =>
    service.calculate({
      bars: [bar(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, 2, 0)],
    }),
  );

  const deterministicInput = {
    bars: [
      bar(101, 99, 100, 1000, 0),
      bar(103, 100, 102, 2000, 1),
      bar(104, 101, 103, 1500, 2),
      bar(106, 102, 105, 2500, 3),
    ],
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.cumulativeVolume === second.cumulativeVolume &&
      first.cumulativePriceVolume === second.cumulativePriceVolume,
  );

  check('FINAL_VWAP_FINITE', Number.isFinite(first.value));

  check('FINAL_VWAP_POSITIVE', first.value > 0);

  check('FINAL_CUMULATIVE_VOLUME_POSITIVE', first.cumulativeVolume > 0);

  console.log('PUNTO 222 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
