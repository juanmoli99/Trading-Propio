import { Module } from '@nestjs/common';
import { EarningsBlackoutAfterService } from './earnings-blackout-after.service';
import { EarningsBlackoutBeforeService } from './earnings-blackout-before.service';
import { EarningsCalendarService } from './earnings-calendar.service';
import { EarningsOvernightPolicyService } from './earnings-overnight-policy.service';
import { EarningsPositionSizeReductionService } from './earnings-position-size-reduction.service';
import { EarningsTimeRemainingService } from './earnings-time-remaining.service';
import { EARNINGS_DATA_PROVIDER } from './earnings-data-provider.interface';
import { FinnhubEarningsProvider } from './finnhub-earnings.provider';
import { NextEarningsService } from './next-earnings.service';
import { KnownMarketEventsService } from './known-market-events.service';
import { StrategyMarketEventPolicyHistoryService } from './strategy-market-event-policy-history.service';
import { StrategyMarketEventPolicyService } from './strategy-market-event-policy.service';

@Module({
  providers: [
    FinnhubEarningsProvider,
    {
      provide: EARNINGS_DATA_PROVIDER,
      useExisting: FinnhubEarningsProvider,
    },
    EarningsTimeRemainingService,
    EarningsBlackoutBeforeService,
    EarningsBlackoutAfterService,
    EarningsPositionSizeReductionService,
    EarningsOvernightPolicyService,
    EarningsCalendarService,
    NextEarningsService,
    KnownMarketEventsService,
    StrategyMarketEventPolicyHistoryService,
    StrategyMarketEventPolicyService,
  ],
  exports: [
    EarningsBlackoutBeforeService,
    EarningsBlackoutAfterService,
    EarningsPositionSizeReductionService,
    EarningsOvernightPolicyService,
    EarningsCalendarService,
    EarningsTimeRemainingService,
    NextEarningsService,
    KnownMarketEventsService,
    StrategyMarketEventPolicyHistoryService,
    StrategyMarketEventPolicyService,
  ],
})
export class MarketEventsModule {}
