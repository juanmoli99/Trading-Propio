export const BUILT_IN_STRATEGY_INDICATORS = [
  'SMA',
  'EMA',
  'RSI',
  'ATR',
  'MACD',
  'BOLLINGER_BANDS',
  'VWAP',
  'ADX',
  'AVERAGE_VOLUME',
  'VOLATILITY',
  'RETURNS',
  'ROLLING_HIGH_LOW',
  'CROSSOVER',
] as const;

export type BuiltInStrategyIndicatorName =
  (typeof BUILT_IN_STRATEGY_INDICATORS)[number];

export type StrategyRequiredIndicators = readonly string[];
