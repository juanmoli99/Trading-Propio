import { Global, Module } from '@nestjs/common';
import { HistoricalBarsService } from './historical-bars.service';
import { HistoricalQuotesService } from './historical-quotes.service';
import { HistoricalTradesService } from './historical-trades.service';
import { LatestBarService } from './latest-bar.service';
import { LatestQuoteService } from './latest-quote.service';
import { LatestTradeService } from './latest-trade.service';
import { MarketDataAgeService } from './market-data-age.service';
import { MarketDataAnomalyService } from './market-data-anomaly.service';
import { MarketDataCacheService } from './market-data-cache.service';
import { MarketDataClientService } from './market-data-client.service';
import { MarketDataFeedRecoveryService } from './market-data-feed-recovery.service';
import { MarketDataFutureBarsService } from './market-data-future-bars.service';
import { MarketDataHaltAuditService } from './market-data-halt-audit.service';
import { MarketDataHaltDetectionService } from './market-data-halt-detection.service';
import { MarketDataHaltPriceInvalidationService } from './market-data-halt-price-invalidation.service';
import { MarketDataHaltSignalInvalidationService } from './market-data-halt-signal-invalidation.service';
import { MarketDataHaltTransitionAuditService } from './market-data-halt-transition-audit.service';
import { MarketDataHealthService } from './market-data-health.service';
import { MarketDataLastValidTimestampService } from './market-data-last-valid-timestamp.service';
import { MarketDataMissingBarsService } from './market-data-missing-bars.service';
import { MarketDataPaginationService } from './market-data-pagination.service';
import { MarketDataPriceSanityService } from './market-data-price-sanity.service';
import { MarketDataRateLimitService } from './market-data-rate-limit.service';
import { MarketDataRequestDedupService } from './market-data-request-dedup.service';
import { MarketDataRequestRecoveryService } from './market-data-request-recovery.service';
import { MarketDataResumeCooldownService } from './market-data-resume-cooldown.service';
import { MarketDataResumeRevalidationService } from './market-data-resume-revalidation.service';
import { MarketDataTradingBlockService } from './market-data-trading-block.service';
import { MarketDataTradingStatusService } from './market-data-trading-status.service';

@Global()
@Module({
  providers: [
    HistoricalBarsService,
    HistoricalQuotesService,
    HistoricalTradesService,
    LatestBarService,
    LatestQuoteService,
    LatestTradeService,
    MarketDataAgeService,
    MarketDataAnomalyService,
    MarketDataCacheService,
    MarketDataClientService,
    MarketDataFeedRecoveryService,
    MarketDataFutureBarsService,
    MarketDataHaltAuditService,
    MarketDataHaltDetectionService,
    MarketDataHaltPriceInvalidationService,
    MarketDataHaltSignalInvalidationService,
    MarketDataHaltTransitionAuditService,
    MarketDataHealthService,
    MarketDataLastValidTimestampService,
    MarketDataMissingBarsService,
    MarketDataPaginationService,
    MarketDataPriceSanityService,
    MarketDataRateLimitService,
    MarketDataRequestDedupService,
    MarketDataRequestRecoveryService,
    MarketDataResumeCooldownService,
    MarketDataResumeRevalidationService,
    MarketDataTradingBlockService,
    MarketDataTradingStatusService,
  ],
  exports: [
    HistoricalBarsService,
    HistoricalQuotesService,
    HistoricalTradesService,
    LatestBarService,
    LatestQuoteService,
    LatestTradeService,
    MarketDataAgeService,
    MarketDataAnomalyService,
    MarketDataCacheService,
    MarketDataClientService,
    MarketDataFeedRecoveryService,
    MarketDataFutureBarsService,
    MarketDataHaltAuditService,
    MarketDataHaltDetectionService,
    MarketDataHaltPriceInvalidationService,
    MarketDataHaltSignalInvalidationService,
    MarketDataHaltTransitionAuditService,
    MarketDataHealthService,
    MarketDataLastValidTimestampService,
    MarketDataMissingBarsService,
    MarketDataPaginationService,
    MarketDataPriceSanityService,
    MarketDataRateLimitService,
    MarketDataRequestDedupService,
    MarketDataRequestRecoveryService,
    MarketDataResumeCooldownService,
    MarketDataResumeRevalidationService,
    MarketDataTradingBlockService,
    MarketDataTradingStatusService,
  ],
})
export class MarketDataModule {}