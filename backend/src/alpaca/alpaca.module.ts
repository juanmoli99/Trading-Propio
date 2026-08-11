import { Global, Module } from '@nestjs/common';
import { AlpacaAccountService } from './alpaca-account.service';
import { AlpacaAssetService } from './alpaca-asset.service';
import { AlpacaCalendarService } from './alpaca-calendar.service';
import { AlpacaCancelOrderService } from './alpaca-cancel-order.service';
import { AlpacaCircuitBreakerService } from './alpaca-circuit-breaker.service';
import { AlpacaClockService } from './alpaca-clock.service';
import { AlpacaExternalActivityService } from './alpaca-external-activity.service';
import { AlpacaFillActivityService } from './alpaca-fill-activity.service';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import { AlpacaOrderOwnershipService } from './alpaca-order-ownership.service';
import { AlpacaOrderService } from './alpaca-order.service';
import { AlpacaPositionService } from './alpaca-position.service';
import { AlpacaRateLimitService } from './alpaca-rate-limit.service';
import { AlpacaReplaceOrderService } from './alpaca-replace-order.service';
import { AlpacaRequestRecoveryService } from './alpaca-request-recovery.service';
import { AlpacaRetryBackoffService } from './alpaca-retry-backoff.service';
import { AlpacaRetryClassifier } from './alpaca-retry-classifier.service';
import { AlpacaRetryPolicy } from './alpaca-retry-policy.service';
import { AlpacaSubmitOrderService } from './alpaca-submit-order.service';

@Global()
@Module({
  providers: [
    AlpacaAccountService,
    AlpacaAssetService,
    AlpacaCalendarService,
    AlpacaCancelOrderService,
    AlpacaCircuitBreakerService,
    AlpacaClockService,
    AlpacaExternalActivityService,
    AlpacaFillActivityService,
    AlpacaHttpClient,
    AlpacaOrderOwnershipService,
    AlpacaOrderService,
    AlpacaPositionService,
    AlpacaRateLimitService,
    AlpacaReplaceOrderService,
    AlpacaRequestRecoveryService,
    AlpacaRetryBackoffService,
    AlpacaRetryClassifier,
    AlpacaRetryPolicy,
    AlpacaSubmitOrderService,
  ],
  exports: [
    AlpacaAccountService,
    AlpacaAssetService,
    AlpacaCalendarService,
    AlpacaCancelOrderService,
    AlpacaCircuitBreakerService,
    AlpacaClockService,
    AlpacaExternalActivityService,
    AlpacaFillActivityService,
    AlpacaHttpClient,
    AlpacaOrderOwnershipService,
    AlpacaOrderService,
    AlpacaPositionService,
    AlpacaRateLimitService,
    AlpacaReplaceOrderService,
    AlpacaRequestRecoveryService,
    AlpacaRetryBackoffService,
    AlpacaRetryClassifier,
    AlpacaRetryPolicy,
    AlpacaSubmitOrderService,
  ],
})
export class AlpacaModule {}
