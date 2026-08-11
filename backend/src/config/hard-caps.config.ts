import { registerAs } from '@nestjs/config';

export interface HardCapsConfiguration {
  maxOrderNotional: number;
  maxTotalCapital: number;
  maxDailyLoss: number;
  maxDrawdownPercent: number;
}

export default registerAs('hardCaps', (): HardCapsConfiguration => ({
  maxOrderNotional: Number(process.env.HARD_CAP_MAX_ORDER_NOTIONAL ?? 1000),
  maxTotalCapital: Number(process.env.HARD_CAP_MAX_TOTAL_CAPITAL ?? 5000),
  maxDailyLoss: Number(process.env.HARD_CAP_MAX_DAILY_LOSS ?? 200),
  maxDrawdownPercent: Number(process.env.HARD_CAP_MAX_DRAWDOWN_PERCENT ?? 10),
}));
