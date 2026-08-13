import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EarningsTimeRemainingService } from './earnings-time-remaining.service';
import type {
  EarningsOvernightPolicyInput,
  EarningsOvernightPolicyResult,
} from './earnings-overnight-policy.types';

const MAX_OVERNIGHT_PROHIBITION_DAYS = 365;

@Injectable()
export class EarningsOvernightPolicyService {
  private readonly enabled: boolean;
  private readonly prohibitionDays: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly earningsTimeRemainingService: EarningsTimeRemainingService,
  ) {
    const enabled = this.configService.get<boolean>(
      'earnings.overnightProhibitionEnabled',
    );

    const prohibitionDays = this.configService.get<number>(
      'earnings.overnightProhibitionDays',
    );

    if (typeof enabled !== 'boolean') {
      throw new Error('Earnings overnight prohibition enabled must be boolean');
    }

    if (
      prohibitionDays === undefined ||
      !Number.isInteger(prohibitionDays) ||
      prohibitionDays < 1 ||
      prohibitionDays > MAX_OVERNIGHT_PROHIBITION_DAYS
    ) {
      throw new Error(
        `Earnings overnightProhibitionDays must be between 1 and ${MAX_OVERNIGHT_PROHIBITION_DAYS}`,
      );
    }

    this.enabled = enabled;
    this.prohibitionDays = prohibitionDays;
  }

  evaluate(input: EarningsOvernightPolicyInput): EarningsOvernightPolicyResult {
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
        true,
        false,
        'DISABLED',
        'Earnings overnight prohibition is disabled',
      );
    }

    if (remaining.calendarDaysRemaining <= 0) {
      return this.createResult(
        remaining.symbol,
        remaining.reportDate,
        remaining.session,
        remaining.asOf,
        remaining.calendarDaysRemaining,
        true,
        false,
        'NOT_APPLICABLE',
        'Earnings event is today or has already passed',
      );
    }

    if (remaining.calendarDaysRemaining <= this.prohibitionDays) {
      return this.createResult(
        remaining.symbol,
        remaining.reportDate,
        remaining.session,
        remaining.asOf,
        remaining.calendarDaysRemaining,
        false,
        true,
        'OVERNIGHT_PROHIBITED',
        `Position must not be held overnight because earnings is within ${this.prohibitionDays} calendar days`,
      );
    }

    return this.createResult(
      remaining.symbol,
      remaining.reportDate,
      remaining.session,
      remaining.asOf,
      remaining.calendarDaysRemaining,
      true,
      false,
      'ALLOWED',
      'Earnings event is outside the configured overnight prohibition window',
    );
  }

  assertOvernightAllowed(
    input: EarningsOvernightPolicyInput,
  ): EarningsOvernightPolicyResult {
    const result = this.evaluate(input);

    if (!result.overnightAllowed) {
      throw new Error(result.reason);
    }

    return result;
  }

  private createResult(
    symbol: string,
    reportDate: string,
    session: EarningsOvernightPolicyResult['session'],
    asOf: Date,
    calendarDaysRemaining: number,
    overnightAllowed: boolean,
    mustExitBeforeOvernight: boolean,
    status: EarningsOvernightPolicyResult['status'],
    reason: string,
  ): EarningsOvernightPolicyResult {
    return {
      symbol,
      reportDate,
      session,
      asOf: new Date(asOf),
      enabled: this.enabled,
      prohibitionDays: this.prohibitionDays,
      calendarDaysRemaining,
      overnightAllowed,
      mustExitBeforeOvernight,
      status,
      reason,
    };
  }
}
