import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OperationalStateService } from '../operational-state/operational-state.service';
import type { StartupCheckResult } from './startup-check.interface';

@Injectable()
export class StartupService {
  constructor(
    private readonly configService: ConfigService,
    private readonly operationalState: OperationalStateService,
  ) {}

  runCriticalChecks(): StartupCheckResult[] {
    const results = [this.checkConfiguration(), this.checkTradingMode()];

    for (const result of results) {
      this.operationalState.setComponentState(
        `startup:${result.name}`,
        result.success,
        result.reason,
      );
    }

    return results;
  }

  assertCriticalChecksPassed(results: StartupCheckResult[]): void {
    const failures = results.filter(
      (result) => result.critical && !result.success,
    );

    if (failures.length === 0) {
      return;
    }

    const details = failures
      .map(
        (failure) => `${failure.name}: ${failure.reason ?? 'unknown failure'}`,
      )
      .join('; ');

    throw new Error(`Critical startup checks failed: ${details}`);
  }

  private checkConfiguration(): StartupCheckResult {
    const port = this.configService.get<number>('app.port');

    if (
      typeof port !== 'number' ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      return {
        name: 'configuration',
        critical: true,
        success: false,
        reason: 'Application port is invalid',
      };
    }

    return {
      name: 'configuration',
      critical: true,
      success: true,
    };
  }

  private checkTradingMode(): StartupCheckResult {
    const tradingMode = this.configService.get<string>('app.tradingMode');

    if (tradingMode !== 'PAPER' && tradingMode !== 'LIVE') {
      return {
        name: 'trading-mode',
        critical: true,
        success: false,
        reason: 'Trading mode is invalid',
      };
    }

    return {
      name: 'trading-mode',
      critical: true,
      success: true,
    };
  }
}
