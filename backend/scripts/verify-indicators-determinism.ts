import { AdxService } from '../src/indicators/adx.service';
import { AtrService } from '../src/indicators/atr.service';
import { AverageVolumeService } from '../src/indicators/average-volume.service';
import { BollingerBandsService } from '../src/indicators/bollinger-bands.service';
import { CrossoverService } from '../src/indicators/crossover.service';
import { EmaService } from '../src/indicators/ema.service';
import { MacdService } from '../src/indicators/macd.service';
import { ReturnsService } from '../src/indicators/returns.service';
import { RollingHighLowService } from '../src/indicators/rolling-high-low.service';
import { RsiService } from '../src/indicators/rsi.service';
import { SmaService } from '../src/indicators/sma.service';
import { VolatilityService } from '../src/indicators/volatility.service';
import { VwapService } from '../src/indicators/vwap.service';
import type { MarketDataBar } from '../src/market-data/market-data.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
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
    tradeCount: 100,
    vwap: close,
  };
}

function main(): void {
  const sma = new SmaService();
  const ema = new EmaService();
  const rsi = new RsiService();
  const atr = new AtrService();
  const macd = new MacdService();
  const bollinger = new BollingerBandsService();
  const vwap = new VwapService();
  const adx = new AdxService();
  const averageVolume = new AverageVolumeService();
  const volatility = new VolatilityService();
  const returns = new ReturnsService();
  const rolling = new RollingHighLowService();
  const crossover = new CrossoverService();

  const values = [
    100, 102, 101, 105, 103, 108, 107, 110, 109, 112, 115, 114, 116, 118, 117,
  ];

  const bars = values.map((value, index) =>
    bar(value + 2, value - 2, value, 1000 + index * 100, index),
  );

  const valuesSnapshot = [...values];

  const barsSnapshot = bars.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));

  const smaInput = {
    values,
    period: 5,
  };

  const smaOne = sma.calculate(smaInput);
  const smaTwo = sma.calculate(smaInput);

  check(
    'SMA_DETERMINISTIC',
    smaOne.value === smaTwo.value && smaOne.period === smaTwo.period,
  );

  const emaInput = {
    values,
    period: 5,
  };

  const emaOne = ema.calculate(emaInput);
  const emaTwo = ema.calculate(emaInput);

  check(
    'EMA_DETERMINISTIC',
    emaOne.value === emaTwo.value &&
      emaOne.period === emaTwo.period &&
      emaOne.multiplier === emaTwo.multiplier,
  );

  const rsiInput = {
    values,
    period: 5,
  };

  const rsiOne = rsi.calculate(rsiInput);
  const rsiTwo = rsi.calculate(rsiInput);

  check(
    'RSI_DETERMINISTIC',
    rsiOne.value === rsiTwo.value &&
      rsiOne.period === rsiTwo.period &&
      rsiOne.averageGain === rsiTwo.averageGain &&
      rsiOne.averageLoss === rsiTwo.averageLoss,
  );

  const atrInput = {
    bars,
    period: 5,
  };

  const atrOne = atr.calculate(atrInput);
  const atrTwo = atr.calculate(atrInput);

  check(
    'ATR_DETERMINISTIC',
    atrOne.value === atrTwo.value &&
      atrOne.period === atrTwo.period &&
      atrOne.trueRange === atrTwo.trueRange,
  );

  const macdInput = {
    values,
    fastPeriod: 3,
    slowPeriod: 5,
    signalPeriod: 3,
  };

  const macdOne = macd.calculate(macdInput);
  const macdTwo = macd.calculate(macdInput);

  check(
    'MACD_DETERMINISTIC',
    macdOne.macd === macdTwo.macd &&
      macdOne.signal === macdTwo.signal &&
      macdOne.histogram === macdTwo.histogram &&
      macdOne.fastPeriod === macdTwo.fastPeriod &&
      macdOne.slowPeriod === macdTwo.slowPeriod &&
      macdOne.signalPeriod === macdTwo.signalPeriod,
  );

  const bollingerInput = {
    values,
    period: 5,
    standardDeviationMultiplier: 2,
  };

  const bollingerOne = bollinger.calculate(bollingerInput);

  const bollingerTwo = bollinger.calculate(bollingerInput);

  check(
    'BOLLINGER_DETERMINISTIC',
    bollingerOne.middle === bollingerTwo.middle &&
      bollingerOne.upper === bollingerTwo.upper &&
      bollingerOne.lower === bollingerTwo.lower &&
      bollingerOne.standardDeviation === bollingerTwo.standardDeviation &&
      bollingerOne.period === bollingerTwo.period &&
      bollingerOne.standardDeviationMultiplier ===
        bollingerTwo.standardDeviationMultiplier,
  );

  const vwapInput = {
    bars,
  };

  const vwapOne = vwap.calculate(vwapInput);
  const vwapTwo = vwap.calculate(vwapInput);

  check(
    'VWAP_DETERMINISTIC',
    vwapOne.value === vwapTwo.value &&
      vwapOne.cumulativeVolume === vwapTwo.cumulativeVolume &&
      vwapOne.cumulativePriceVolume === vwapTwo.cumulativePriceVolume,
  );

  const adxInput = {
    bars,
    period: 5,
  };

  const adxOne = adx.calculate(adxInput);
  const adxTwo = adx.calculate(adxInput);

  check(
    'ADX_DETERMINISTIC',
    adxOne.adx === adxTwo.adx &&
      adxOne.plusDi === adxTwo.plusDi &&
      adxOne.minusDi === adxTwo.minusDi &&
      adxOne.dx === adxTwo.dx &&
      adxOne.period === adxTwo.period,
  );

  const averageVolumeInput = {
    bars,
    period: 5,
  };

  const averageVolumeOne = averageVolume.calculate(averageVolumeInput);

  const averageVolumeTwo = averageVolume.calculate(averageVolumeInput);

  check(
    'AVERAGE_VOLUME_DETERMINISTIC',
    averageVolumeOne.value === averageVolumeTwo.value &&
      averageVolumeOne.period === averageVolumeTwo.period &&
      averageVolumeOne.totalVolume === averageVolumeTwo.totalVolume,
  );

  const volatilityInput = {
    values,
    period: 5,
  };

  const volatilityOne = volatility.calculate(volatilityInput);

  const volatilityTwo = volatility.calculate(volatilityInput);

  check(
    'VOLATILITY_DETERMINISTIC',
    volatilityOne.value === volatilityTwo.value &&
      volatilityOne.period === volatilityTwo.period &&
      volatilityOne.meanReturn === volatilityTwo.meanReturn &&
      volatilityOne.variance === volatilityTwo.variance,
  );

  const returnsInput = {
    values,
  };

  const returnsOne = returns.calculate(returnsInput);
  const returnsTwo = returns.calculate(returnsInput);

  check(
    'RETURNS_DETERMINISTIC',
    returnsOne.latest === returnsTwo.latest &&
      returnsOne.values.length === returnsTwo.values.length &&
      returnsOne.values.every(
        (value, index) => value === returnsTwo.values[index],
      ),
  );

  const rollingInput = {
    values,
    period: 5,
  };

  const rollingOne = rolling.calculate(rollingInput);
  const rollingTwo = rolling.calculate(rollingInput);

  check(
    'ROLLING_HIGH_LOW_DETERMINISTIC',
    rollingOne.high === rollingTwo.high &&
      rollingOne.low === rollingTwo.low &&
      rollingOne.period === rollingTwo.period,
  );

  const crossoverInput = {
    left: [1, 2, 3, 2, 5],
    right: [2, 2, 2, 3, 4],
  };

  const crossoverOne = crossover.calculate(crossoverInput);

  const crossoverTwo = crossover.calculate(crossoverInput);

  check(
    'CROSSOVER_DETERMINISTIC',
    crossoverOne.type === crossoverTwo.type &&
      crossoverOne.crossed === crossoverTwo.crossed &&
      crossoverOne.previousLeft === crossoverTwo.previousLeft &&
      crossoverOne.previousRight === crossoverTwo.previousRight &&
      crossoverOne.currentLeft === crossoverTwo.currentLeft &&
      crossoverOne.currentRight === crossoverTwo.currentRight,
  );

  check(
    'SHARED_NUMERIC_INPUT_NOT_MUTATED',
    values.length === valuesSnapshot.length &&
      values.every((value, index) => value === valuesSnapshot[index]),
  );

  check(
    'SHARED_BAR_INPUT_NOT_MUTATED',
    bars.length === barsSnapshot.length &&
      bars.every((item, index) => {
        const original = barsSnapshot[index];

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

  const smaThird = sma.calculate({
    values: [...values],
    period: 5,
  });

  check('SMA_EQUAL_FOR_EQUIVALENT_INPUT_COPY', smaThird.value === smaOne.value);

  const adxThird = adx.calculate({
    bars: bars.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    })),
    period: 5,
  });

  check(
    'ADX_EQUAL_FOR_EQUIVALENT_INPUT_COPY',
    adxThird.adx === adxOne.adx &&
      adxThird.plusDi === adxOne.plusDi &&
      adxThird.minusDi === adxOne.minusDi &&
      adxThird.dx === adxOne.dx,
  );

  console.log('PUNTO 230 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

