export interface RollingHighLowInput {
  readonly values: readonly number[];
  readonly period: number;
}

export interface RollingHighLowResult {
  readonly high: number;
  readonly low: number;
  readonly period: number;
}
