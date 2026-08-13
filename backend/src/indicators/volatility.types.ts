export interface VolatilityInput {
  readonly values: readonly number[];
  readonly period: number;
}

export interface VolatilityResult {
  readonly value: number;
  readonly period: number;
  readonly meanReturn: number;
  readonly variance: number;
}
