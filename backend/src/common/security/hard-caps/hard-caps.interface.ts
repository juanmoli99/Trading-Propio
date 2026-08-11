export interface HardCapsSnapshot {
  readonly maxOrderNotional: number;
  readonly maxTotalCapital: number;
  readonly maxDailyLoss: number;
  readonly maxDrawdownPercent: number;
}
