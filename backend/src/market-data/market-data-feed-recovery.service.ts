import { Injectable } from '@nestjs/common';
import { OperationalStateService } from '../common/operational-state/operational-state.service';
import { MarketDataAgeService } from './market-data-age.service';
import { MarketDataHealthService } from './market-data-health.service';
import type {
  MarketDataFeedRecoverySnapshot,
  MarketDataFeedRecoveryStatus,
} from './market-data-feed-recovery.types';

const MARKET_DATA_FEED_RECOVERY_COMPONENT = 'market-data:feed-recovery';

@Injectable()
export class MarketDataFeedRecoveryService {
  private status: MarketDataFeedRecoveryStatus = 'STABLE';

  private outageStartedAt: string | undefined;

  private reconnectedAt: string | undefined;

  private warmupCompletedAt: string | undefined;

  private updatedAt = new Date().toISOString();

  constructor(
    private readonly marketDataHealth: MarketDataHealthService,
    private readonly operationalState: OperationalStateService,
    private readonly marketDataAge: MarketDataAgeService,
  ) {}

  recordUnavailable(): void {
    const now = new Date().toISOString();

    if (this.status !== 'OUTAGE') {
      this.outageStartedAt = now;
    }

    this.status = 'OUTAGE';
    this.reconnectedAt = undefined;
    this.warmupCompletedAt = undefined;
    this.updatedAt = now;

    this.marketDataHealth.evaluate({
      available: false,
      stale: false,
      inconsistent: false,
      reasons: ['Market data feed is unavailable'],
    });

    this.operationalState.setComponentState(
      MARKET_DATA_FEED_RECOVERY_COMPONENT,
      false,
      'Market data feed outage detected',
    );
  }

  recordSuccessfulRequest(): void {
    if (this.status !== 'OUTAGE') {
      return;
    }

    const now = new Date().toISOString();

    this.status = 'RECOVERING';
    this.reconnectedAt = now;
    this.warmupCompletedAt = undefined;
    this.updatedAt = now;

    this.marketDataHealth.evaluate({
      available: true,
      stale: true,
      inconsistent: false,
      reasons: [
        'Market data feed reconnected; warm-up validation is pending',
      ],
    });

    this.operationalState.setComponentState(
      MARKET_DATA_FEED_RECOVERY_COMPONENT,
      false,
      'Market data feed reconnected but warm-up validation is pending',
    );
  }

  completeWarmup(
    validatedTimestamp: Date,
    referenceTimestamp: Date = new Date(),
  ): boolean {
    if (this.status !== 'RECOVERING' || this.reconnectedAt === undefined) {
      return false;
    }

    const validatedTimestampMs = validatedTimestamp.getTime();
    const referenceTimestampMs = referenceTimestamp.getTime();
    const reconnectedAtMs = new Date(this.reconnectedAt).getTime();

    if (
      !Number.isFinite(validatedTimestampMs) ||
      !Number.isFinite(referenceTimestampMs) ||
      !Number.isFinite(reconnectedAtMs)
    ) {
      throw new Error('Invalid market data warm-up timestamp');
    }

    if (validatedTimestampMs < reconnectedAtMs) {
      this.keepWarmupPending(
        'Market data warm-up rejected because data predates reconnection',
      );

      return false;
    }

    const tooOld = this.marketDataAge.detectTooOld(
      [{ timestamp: validatedTimestamp }],
      undefined,
      referenceTimestamp,
    );

    if (tooOld.length > 0) {
      this.keepWarmupPending(
        'Market data warm-up rejected because data is stale',
      );

      return false;
    }

    const now = new Date().toISOString();

    this.status = 'STABLE';
    this.warmupCompletedAt = now;
    this.updatedAt = now;

    this.marketDataHealth.evaluate({
      available: true,
      stale: false,
      inconsistent: false,
    });

    this.operationalState.setComponentState(
      MARKET_DATA_FEED_RECOVERY_COMPONENT,
      true,
    );

    return true;
  }

  getStatus(): MarketDataFeedRecoveryStatus {
    return this.status;
  }

  isRecovering(): boolean {
    return this.status === 'RECOVERING';
  }

  getSnapshot(): MarketDataFeedRecoverySnapshot {
    return {
      status: this.status,
      outageStartedAt: this.outageStartedAt,
      reconnectedAt: this.reconnectedAt,
      warmupCompletedAt: this.warmupCompletedAt,
      updatedAt: this.updatedAt,
    };
  }

  private keepWarmupPending(reason: string): void {
    const now = new Date().toISOString();

    this.updatedAt = now;

    this.marketDataHealth.evaluate({
      available: true,
      stale: true,
      inconsistent: false,
      reasons: [reason],
    });

    this.operationalState.setComponentState(
      MARKET_DATA_FEED_RECOVERY_COMPONENT,
      false,
      reason,
    );
  }
}