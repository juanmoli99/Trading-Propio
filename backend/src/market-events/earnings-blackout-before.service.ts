import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsTimeRemainingService } from './earnings-time-remaining.service';
import type {
  EarningsBlackoutBeforeInput,
  EarningsBlackoutBeforeResult,
} from './earnings-blackout-before.types';

const MAX_BLACKOUT_BEFORE_DAYS = 365;

@Injectable()
export class EarningsBlackoutBeforeService {
  private readonly blackoutBeforeDays: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly earningsTimeRemainingService: EarningsTimeRemainingService,
  ) {
    const configured = this.configService.get<number>(
      'earnings.blackoutBeforeDays',
    );

    if (
      configured === undefined ||
      !Number.isInteger(configured) ||
      configured < 0 ||
      configured > MAX_BLACKOUT_BEFORE_DAYS
    ) {
      throw new Error(
        `Earnings blackoutBeforeDays must be between 0 and ${MAX_BLACKOUT_BEFORE_DAYS}`,
      );
    }

    this.blackoutBeforeDays = configured;
  }

  evaluate(input: EarningsBlackoutBeforeInput): EarningsBlackoutBeforeResult {
    const remaining = this.earningsTimeRemainingService.calculate({
      event: input.event,
      asOf: input.asOf,
    });

    if (remaining.calendarDaysRemaining < 0) {
      return {
        symbol: remaining.symbol,
        reportDate: remaining.reportDate,
        session: remaining.session,
        asOf: new Date(remaining.asOf),
        blackoutBeforeDays: this.blackoutBeforeDays,
        calendarDaysRemaining: remaining.calendarDaysRemaining,
        blocked: false,
        status: 'EVENT_ALREADY_PASSED',
        reason: 'Earnings event already passed by calendar date',
      };
    }

    if (remaining.calendarDaysRemaining <= this.blackoutBeforeDays) {
      return {
        symbol: remaining.symbol,
        reportDate: remaining.reportDate,
        session: remaining.session,
        asOf: new Date(remaining.asOf),
        blackoutBeforeDays: this.blackoutBeforeDays,
        calendarDaysRemaining: remaining.calendarDaysRemaining,
        blocked: true,
        status: 'BLACKED_OUT',
        reason: `Earnings event is within the configured ${this.blackoutBeforeDays}-day pre-earnings blackout window`,
      };
    }

    return {
      symbol: remaining.symbol,
      reportDate: remaining.reportDate,
      session: remaining.session,
      asOf: new Date(remaining.asOf),
      blackoutBeforeDays: this.blackoutBeforeDays,
      calendarDaysRemaining: remaining.calendarDaysRemaining,
      blocked: false,
      status: 'ALLOWED',
      reason:
        'Earnings event is outside the configured pre-earnings blackout window',
    };
  }

  assertEntryAllowed(
    input: EarningsBlackoutBeforeInput,
  ): EarningsBlackoutBeforeResult {
    const result = this.evaluate(input);

    if (result.blocked) {
      throw new Error(result.reason);
    }

    return result;
  }
}
