import { registerAs } from '@nestjs/config';

export interface EarningsConfiguration {
  blackoutBeforeDays: number;
  blackoutAfterDays: number;
  positionSizeReductionEnabled: boolean;
  positionSizeReductionDays: number;
  positionSizeMultiplier: number;
  overnightProhibitionEnabled: boolean;
  overnightProhibitionDays: number;
}

export default registerAs('earnings', (): EarningsConfiguration => ({
  blackoutBeforeDays: Number(process.env.EARNINGS_BLACKOUT_BEFORE_DAYS ?? 1),
  blackoutAfterDays: Number(process.env.EARNINGS_BLACKOUT_AFTER_DAYS ?? 1),
  positionSizeReductionEnabled:
    process.env.EARNINGS_POSITION_SIZE_REDUCTION_ENABLED === 'true',
  positionSizeReductionDays: Number(
    process.env.EARNINGS_POSITION_SIZE_REDUCTION_DAYS ?? 3,
  ),
  positionSizeMultiplier: Number(
    process.env.EARNINGS_POSITION_SIZE_MULTIPLIER ?? 0.5,
  ),
  overnightProhibitionEnabled:
    process.env.EARNINGS_OVERNIGHT_PROHIBITION_ENABLED === 'true',
  overnightProhibitionDays: Number(
    process.env.EARNINGS_OVERNIGHT_PROHIBITION_DAYS ?? 1,
  ),
}));
