import { Module } from '@nestjs/common';
import { CorporateActionAdjustmentHistoryService } from './corporate-action-adjustment-history.service';
import { CorporateActionCashDividendService } from './corporate-action-cash-dividend.service';
import { CorporateActionCostBasisReconciliationService } from './corporate-action-cost-basis-reconciliation.service';
import { CorporateActionEntryBlockService } from './corporate-action-entry-block.service';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import { CorporateActionMarketDataCacheInvalidationService } from './corporate-action-market-data-cache-invalidation.service';
import { CorporateActionMergerService } from './corporate-action-merger.service';
import { CorporateActionNameChangeService } from './corporate-action-name-change.service';
import { CorporateActionOpenOrderAssociationService } from './corporate-action-open-order-association.service';
import { CorporateActionPendingOrderReviewService } from './corporate-action-pending-order-review.service';
import { CorporateActionPendingService } from './corporate-action-pending.service';
import { CorporateActionPositionAssociationService } from './corporate-action-position-association.service';
import { CorporateActionPostEventReconciliationService } from './corporate-action-post-event-reconciliation.service';
import { CorporateActionQuantityReconciliationService } from './corporate-action-quantity-reconciliation.service';
import { CorporateActionRedemptionService } from './corporate-action-redemption.service';
import { CorporateActionSpinOffService } from './corporate-action-spin-off.service';
import { CorporateActionStockDividendService } from './corporate-action-stock-dividend.service';
import { CorporateActionStrategySymbolUpdateService } from './corporate-action-strategy-symbol-update.service';
import { CorporateActionSymbolUpdateService } from './corporate-action-symbol-update.service';
import { CorporateActionSplitService } from './corporate-action-split.service';
import { CorporateActionWatchlistUpdateService } from './corporate-action-watchlist-update.service';
import { CorporateActionWorthlessRemovalService } from './corporate-action-worthless-removal.service';
import { CorporateActionsService } from './corporate-actions.service';

@Module({
  providers: [
    CorporateActionCashDividendService,
    CorporateActionCostBasisReconciliationService,
    CorporateActionEntryBlockService,
    CorporateActionEffectiveService,
    CorporateActionMarketDataCacheInvalidationService,
    CorporateActionMergerService,
    CorporateActionNameChangeService,
    CorporateActionOpenOrderAssociationService,
    CorporateActionPendingOrderReviewService,
    CorporateActionPendingService,
    CorporateActionPositionAssociationService,
    CorporateActionPostEventReconciliationService,
    CorporateActionQuantityReconciliationService,
    CorporateActionRedemptionService,
    CorporateActionSpinOffService,
    CorporateActionStockDividendService,
    CorporateActionStrategySymbolUpdateService,
    CorporateActionSymbolUpdateService,
    CorporateActionSplitService,
    CorporateActionWatchlistUpdateService,
    CorporateActionWorthlessRemovalService,
    CorporateActionsService,
  ],
  exports: [
    CorporateActionCashDividendService,
    CorporateActionCostBasisReconciliationService,
    CorporateActionEntryBlockService,
    CorporateActionEffectiveService,
    CorporateActionMarketDataCacheInvalidationService,
    CorporateActionMergerService,
    CorporateActionNameChangeService,
    CorporateActionOpenOrderAssociationService,
    CorporateActionPendingOrderReviewService,
    CorporateActionPendingService,
    CorporateActionPositionAssociationService,
    CorporateActionPostEventReconciliationService,
    CorporateActionQuantityReconciliationService,
    CorporateActionRedemptionService,
    CorporateActionSpinOffService,
    CorporateActionStockDividendService,
    CorporateActionStrategySymbolUpdateService,
    CorporateActionSymbolUpdateService,
    CorporateActionSplitService,
    CorporateActionWatchlistUpdateService,
    CorporateActionWorthlessRemovalService,
    CorporateActionsService,
  ],
})
export class CorporateActionsModule {}
