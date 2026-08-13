export interface MacdInput {
  readonly values: readonly number[];
  readonly fastPeriod: number;
  readonly slowPeriod: number;
  readonly signalPeriod: number;
}

export interface MacdResult {
  readonly macd: number;
  readonly signal: number;
  readonly histogram: number;
  readonly fastPeriod: number;
  readonly slowPeriod: number;
  readonly signalPeriod: number;
}
