import { Injectable } from '@nestjs/common';
import { OperationalStateService } from '../common/operational-state/operational-state.service';
import { MarketDataAgeService } from './market-data-age.service';
import { MarketDataAnomalyService } from './market-data-anomaly.service';
import type { MarketDataPriceSanityIssue } from './market-data-price-sanity';
import type { MarketDataOutsideSessionItem } from './market-data-session';
import type {
  MarketDataFutureBar,
  MarketDataMissingBarGap,
} from './market-data.types';

const MARKET_DATA_TRADING_COMPONENT = 'market-data:trading-valid';

export interface MarketDataTradingValidation {
  readonly symbol?: string;
  readonly futureBars?: readonly MarketDataFutureBar[];
  readonly missingBarGaps?: readonly MarketDataMissingBarGap[];
  readonly outsideSessionItems?: readonly MarketDataOutsideSessionItem[];
  readonly priceSanityIssues?: readonly MarketDataPriceSanityIssue[];
  readonly lastValidTimestamp?: Date;
}

export interface MarketDataTradingValidationResult {
  readonly valid: boolean;
  readonly tradingBlocked: boolean;
  readonly reasons: readonly string[];
}

@Injectable()
export class MarketDataTradingBlockService {
  constructor(
    private readonly operationalState: OperationalStateService,
    private readonly anomalyService: MarketDataAnomalyService,
    private readonly marketDataAgeService: MarketDataAgeService,
  ) {}

  evaluate(
    validation: MarketDataTradingValidation,
  ): MarketDataTradingValidationResult {
    const reasons = this.collectReasons(validation);

    if (reasons.length === 0) {
      const existing = this.operationalState.getComponentState(
        MARKET_DATA_TRADING_COMPONENT,
      );

      return {
        valid: true,
        tradingBlocked: existing?.available === false,
        reasons: [],
      };
    }

    const reason = reasons.join('; ');

    this.operationalState.setComponentState(
      MARKET_DATA_TRADING_COMPONENT,
      false,
      reason,
    );

    if (this.operationalState.getStatus() !== 'EMERGENCY') {
      this.operationalState.setStatus(
        'BLOCKED',
        `Trading blocked because market data is invalid: ${reason}`,
      );
    }

    return {
      valid: false,
      tradingBlocked: true,
      reasons,
    };
  }

  async evaluateAndRecord(
    validation: MarketDataTradingValidation,
  ): Promise<MarketDataTradingValidationResult> {
    const result = this.evaluate(validation);

    if (!result.valid) {
      await this.recordAnomalies(validation);
    }

    return result;
  }

  assertTradingAllowed(): void {
    const component = this.operationalState.getComponentState(
      MARKET_DATA_TRADING_COMPONENT,
    );

    if (component?.available !== false) {
      return;
    }

    throw new Error(
      `Trading blocked because market data is invalid: ${
        component.reason ?? 'unknown market data validation failure'
      }`,
    );
  }

  isTradingBlocked(): boolean {
    return (
      this.operationalState.getComponentState(MARKET_DATA_TRADING_COMPONENT)
        ?.available === false
    );
  }

  private collectReasons(
    validation: MarketDataTradingValidation,
  ): string[] {
    const reasons: string[] = [];

    const futureBars = validation.futureBars?.length ?? 0;

    const missingBarGaps = validation.missingBarGaps?.length ?? 0;

    const outsideSessionItems = validation.outsideSessionItems?.length ?? 0;

    const priceSanityIssues = validation.priceSanityIssues?.length ?? 0;

    if (futureBars > 0) {
      reasons.push(`${futureBars} future market data bar(s) detected`);
    }

    if (missingBarGaps > 0) {
      reasons.push(`${missingBarGaps} missing market data gap(s) detected`);
    }

    if (outsideSessionItems > 0) {
      reasons.push(
        `${outsideSessionItems} market data item(s) outside valid session detected`,
      );
    }

    if (priceSanityIssues > 0) {
      reasons.push(
        `${priceSanityIssues} market data price sanity issue(s) detected`,
      );
    }

    if (validation.lastValidTimestamp !== undefined) {
      const tooOld = this.marketDataAgeService.detectTooOld([
        {
          timestamp: validation.lastValidTimestamp,
        },
      ]);

      if (tooOld.length > 0) {
        const item = tooOld[0];

        reasons.push(
          `Market data is too old by ${item.exceededByMs}ms (maximum allowed age: ${item.maxAgeMs}ms)`,
        );
      }
    }

    return reasons;
  }

  private async recordAnomalies(
    validation: MarketDataTradingValidation,
  ): Promise<void> {
    for (const futureBar of validation.futureBars ?? []) {
      await this.anomalyService.record({
        type: 'FUTURE_BAR',
        symbol: validation.symbol,
        timestamp: futureBar.timestamp,
        referenceAt: futureBar.referenceTimestamp,
        details: {
          futureByMs: futureBar.futureByMs,
        },
      });
    }

    for (const gap of validation.missingBarGaps ?? []) {
      await this.anomalyService.record({
        type: 'MISSING_BAR_GAP',
        symbol: validation.symbol,
        timestamp: gap.nextTimestamp,
        referenceAt: gap.previousTimestamp,
        details: {
          missingCount: gap.missingCount,
          expectedIntervalMs: gap.expectedIntervalMs,
        },
      });
    }

    for (const outsideSessionItem of validation.outsideSessionItems ?? []) {
      await this.anomalyService.record({
        type: 'OUTSIDE_SESSION',
        symbol: validation.symbol,
        timestamp: outsideSessionItem.timestamp,
        details: {
          marketDate: outsideSessionItem.marketDate,
          reason: outsideSessionItem.reason,
        },
      });
    }

    for (const priceIssue of validation.priceSanityIssues ?? []) {
      await this.anomalyService.record({
        type: 'PRICE_SANITY',
        symbol: validation.symbol,
        timestamp: priceIssue.timestamp,
        referenceAt: priceIssue.previousTimestamp,
        details: {
          previousPrice: priceIssue.previousPrice,
          price: priceIssue.price,
          absoluteChange: priceIssue.absoluteChange,
          percentageChange: priceIssue.percentageChange,
          maxPercentageChange: priceIssue.maxPercentageChange,
        },
      });
    }

    if (validation.lastValidTimestamp !== undefined) {
      const tooOld = this.marketDataAgeService.detectTooOld([
        {
          timestamp: validation.lastValidTimestamp,
        },
      ]);

      for (const item of tooOld) {
        await this.anomalyService.record({
          type: 'TOO_OLD_DATA',
          symbol: validation.symbol,
          timestamp: item.timestamp,
          referenceAt: item.referenceTimestamp,
          details: {
            ageMs: item.ageMs,
            maxAgeMs: item.maxAgeMs,
            exceededByMs: item.exceededByMs,
          },
        });
      }
    }
  }
}

