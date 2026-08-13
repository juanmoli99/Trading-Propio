export interface IndicatorInput {
  readonly values: readonly number[];
}

export interface IndicatorResult<TValue> {
  readonly value: TValue;
}

export interface Indicator<TInput, TOutput> {
  calculate(input: TInput): TOutput;
}
