import { Injectable } from '@nestjs/common';
import { OperationalStateService } from '../common/operational-state/operational-state.service';
import type {
  MarketDataHealthEvaluation,
  MarketDataHealthSnapshot,
  MarketDataHealthStatus,
} from './market-data-health.types';

const MARKET_DATA_HEALTH_COMPONENT = 'market-data:health';

@Injectable()
export class MarketDataHealthService {
  private snapshot: MarketDataHealthSnapshot = {
    status: 'UNAVAILABLE',
    reasons: ['Market data health has not been evaluated'],
    updatedAt: new Date().toISOString(),
  };

  constructor(private readonly operationalState: OperationalStateService) {}

  evaluate(input: MarketDataHealthEvaluation): MarketDataHealthSnapshot {
    const status = this.resolveStatus(input);
    const reasons = this.normalizeReasons(input.reasons, status);
    const updatedAt = new Date().toISOString();

    this.snapshot = {
      status,
      reasons,
      updatedAt,
    };

    this.operationalState.setComponentState(
      MARKET_DATA_HEALTH_COMPONENT,
      status === 'HEALTHY',
      reasons.length > 0 ? reasons.join('; ') : undefined,
    );

    return this.getSnapshot();
  }

  getSnapshot(): MarketDataHealthSnapshot {
    return {
      status: this.snapshot.status,
      reasons: [...this.snapshot.reasons],
      updatedAt: this.snapshot.updatedAt,
    };
  }

  getStatus(): MarketDataHealthStatus {
    return this.snapshot.status;
  }

  isEntryBlocked(): boolean {
    return (
      this.snapshot.status === 'STALE' ||
      this.snapshot.status === 'UNAVAILABLE'
    );
  }

  assertEntryAllowed(): void {
    if (!this.isEntryBlocked()) {
      return;
    }

    const reason =
      this.snapshot.reasons.length > 0
        ? this.snapshot.reasons.join('; ')
        : 'unknown market data health failure';

    throw new Error(
      `New entries blocked because market data health is ${this.snapshot.status}: ${reason}`,
    );
  }

  private resolveStatus(
    input: MarketDataHealthEvaluation,
  ): MarketDataHealthStatus {
    if (!input.available) {
      return 'UNAVAILABLE';
    }

    if (input.inconsistent) {
      return 'INCONSISTENT';
    }

    if (input.stale) {
      return 'STALE';
    }

    return 'HEALTHY';
  }

  private normalizeReasons(
    reasons: readonly string[] | undefined,
    status: MarketDataHealthStatus,
  ): string[] {
    const normalized = (reasons ?? [])
      .map((reason) => reason.trim())
      .filter((reason) => reason.length > 0);

    if (normalized.length > 0) {
      return [...new Set(normalized)];
    }

    switch (status) {
      case 'UNAVAILABLE':
        return ['Market data is unavailable'];

      case 'INCONSISTENT':
        return ['Market data is inconsistent'];

      case 'STALE':
        return ['Market data is stale'];

      case 'HEALTHY':
      default:
        return [];
    }
  }
}