export interface BollingerBandsInput {
  readonly values: readonly number[];
  readonly period: number;
  readonly standardDeviationMultiplier: number;
}

export interface BollingerBandsResult {
  readonly middle: number;
  readonly upper: number;
  readonly lower: number;
  readonly standardDeviation: number;
  readonly period: number;
  readonly standardDeviationMultiplier: number;
}
