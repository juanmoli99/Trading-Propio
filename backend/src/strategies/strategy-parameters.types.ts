export type StrategyParameterPrimitive = string | number | boolean | null;

export type StrategyParameterValue =
  | StrategyParameterPrimitive
  | readonly StrategyParameterValue[]
  | StrategyParameterObject;

export interface StrategyParameterObject {
  readonly [key: string]: StrategyParameterValue;
}

export type StrategyParameters = Readonly<
  Record<string, StrategyParameterValue>
>;
