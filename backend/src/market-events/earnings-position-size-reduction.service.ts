import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsTimeRemainingService } from './earnings-time-remaining.service';
import type {
  EarningsPositionSizeReductionInput,
  EarningsPositionSizeReductionResult,
} from './earnings-position-size-reduction.types';

const MAX_REDUCTION_DAYS = 365;

@Injectable()
export class EarningsPositionSizeReductionService {
  private readonly enabled: boolean;
  private readonly reductionDays: number;
  private readonly configuredMultiplier: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly earningsTimeRemainingService: EarningsTimeRemainingService,
  ) {
    const enabled = this.configService.get<boolean>(
      'earnings.positionSizeReductionEnabled',
    );

    const reductionDays = this.configService.get<number>(
      'earnings.positionSizeReductionDays',
    );

    const multiplier = this.configService.get<number>(
      'earnings.positionSizeMultiplier',
    );

    if (typeof enabled !== 'boolean') {
      throw new Error(
        'Earnings position size reduction enabled must be boolean',
      );
    }

    if (
      reductionDays === undefined ||
      !Number.isInteger(reductionDays) ||
      reductionDays < 1 ||
      reductionDays > MAX_REDUCTION_DAYS
    ) {
      throw new Error(
        `Earnings positionSizeReductionDays must be between 1 and ${MAX_REDUCTION_DAYS}`,
      );
    }

    if (
      multiplier === undefined ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0 ||
      multiplier > 1
    ) {
      throw new Error(
        'Earnings positionSizeMultiplier must be greater than 0 and less than or equal to 1',
      );
    }

    this.enabled = enabled;
    this.reductionDays = reductionDays;
    this.configuredMultiplier = multiplier;
  }

  evaluate(
    input: EarningsPositionSizeReductionInput,
  ): EarningsPositionSizeReductionResult {
    const remaining = this.earningsTimeRemainingService.calculate({
      event: input.event,
      asOf: input.asOf,
    });

    if (!this.enabled) {
      return this.createResult(
        remaining.symbol,
        remaining.reportDate,
        remaining.session,
        remaining.asOf,
        remaining.calendarDaysRemaining,
        1,
        false,
        'DISABLED',
        'Earnings position size reduction is disabled',
      );
    }

    if (
      remaining.calendarDaysRemaining <= 0 ||
      remaining.calendarDaysRemaining > this.reductionDays
    ) {
      return this.createResult(
        remaining.symbol,
        remaining.reportDate,
        remaining.session,
        remaining.asOf,
        remaining.calendarDaysRemaining,
        1,
        false,
        'NOT_APPLICABLE',
        'Earnings event is outside the configured position size reduction window',
      );
    }

    return this.createResult(
      remaining.symbol,
      remaining.reportDate,
      remaining.session,
      remaining.asOf,
      remaining.calendarDaysRemaining,
      this.configuredMultiplier,
      this.configuredMultiplier < 1,
      'REDUCED',
      `Position size multiplier reduced to ${this.configuredMultiplier} because earnings is within ${this.reductionDays} calendar days`,
    );
  }

  private createResult(
    symbol: string,
    reportDate: string,
    session: EarningsPositionSizeReductionResult['session'],
    asOf: Date,
    calendarDaysRemaining: number,
    multiplier: number,
    reduced: boolean,
    status: EarningsPositionSizeReductionResult['status'],
    reason: string,
  ): EarningsPositionSizeReductionResult {
    return {
      symbol,
      reportDate,
      session,
      asOf: new Date(asOf),
      enabled: this.enabled,
      reductionDays: this.reductionDays,
      calendarDaysRemaining,
      multiplier,
      reduced,
      status,
      reason,
    };
  }
}
