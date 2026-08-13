export interface RsiInput {
  readonly values: readonly number[];
  readonly period: number;
}

export interface RsiResult {
  readonly value: number;
  readonly period: number;
  readonly averageGain: number;
  readonly averageLoss: number;
}
