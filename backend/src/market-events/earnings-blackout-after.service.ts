import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsTimeRemainingService } from './earnings-time-remaining.service';
import type {
  EarningsBlackoutAfterInput,
  EarningsBlackoutAfterResult,
} from './earnings-blackout-after.types';

const MAX_BLACKOUT_AFTER_DAYS = 365;

@Injectable()
export class EarningsBlackoutAfterService {
  private readonly blackoutAfterDays: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly earningsTimeRemainingService: EarningsTimeRemainingService,
  ) {
    const configured = this.configService.get<number>(
      'earnings.blackoutAfterDays',
    );

    if (
      configured === undefined ||
      !Number.isInteger(configured) ||
      configured < 0 ||
      configured > MAX_BLACKOUT_AFTER_DAYS
    ) {
      throw new Error(
        `Earnings blackoutAfterDays must be between 0 and ${MAX_BLACKOUT_AFTER_DAYS}`,
      );
    }

    this.blackoutAfterDays = configured;
  }

  evaluate(input: EarningsBlackoutAfterInput): EarningsBlackoutAfterResult {
    const remaining = this.earningsTimeRemainingService.calculate({
      event: input.event,
      asOf: input.asOf,
    });

    const calendarDaysSinceEarnings = -remaining.calendarDaysRemaining;

    if (remaining.calendarDaysRemaining >= 0) {
      return {
        symbol: remaining.symbol,
        reportDate: remaining.reportDate,
        session: remaining.session,
        asOf: new Date(remaining.asOf),
        blackoutAfterDays: this.blackoutAfterDays,
        calendarDaysSinceEarnings,
        blocked: false,
        status: 'EVENT_NOT_OCCURRED',
        reason: 'Earnings event has not passed by calendar date',
      };
    }

    if (calendarDaysSinceEarnings <= this.blackoutAfterDays) {
      return {
        symbol: remaining.symbol,
        reportDate: remaining.reportDate,
        session: remaining.session,
        asOf: new Date(remaining.asOf),
        blackoutAfterDays: this.blackoutAfterDays,
        calendarDaysSinceEarnings,
        blocked: true,
        status: 'BLACKED_OUT',
        reason: `Earnings event is within the configured ${this.blackoutAfterDays}-day post-earnings blackout window`,
      };
    }

    return {
      symbol: remaining.symbol,
      reportDate: remaining.reportDate,
      session: remaining.session,
      asOf: new Date(remaining.asOf),
      blackoutAfterDays: this.blackoutAfterDays,
      calendarDaysSinceEarnings,
      blocked: false,
      status: 'ALLOWED',
      reason:
        'Earnings event is outside the configured post-earnings blackout window',
    };
  }

  assertEntryAllowed(
    input: EarningsBlackoutAfterInput,
  ): EarningsBlackoutAfterResult {
    const result = this.evaluate(input);

    if (result.blocked) {
      throw new Error(result.reason);
    }

    return result;
  }
}
