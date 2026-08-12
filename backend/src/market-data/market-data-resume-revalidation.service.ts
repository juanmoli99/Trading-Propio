import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from './market-data-halt-detection.service';
import {
  MARKET_DATA_RESUME_REVALIDATION_CHECKS,
  type MarketDataResumeRevalidationCheck,
  type MarketDataResumeRevalidationCheckName,
  type MarketDataResumeRevalidationCheckResult,
  type MarketDataResumeRevalidationInput,
  type MarketDataResumeRevalidationResult,
} from './market-data-resume-revalidation.types';

@Injectable()
export class MarketDataResumeRevalidationService {
  constructor(
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  evaluate(
    input: MarketDataResumeRevalidationInput,
  ): MarketDataResumeRevalidationResult {
    const symbol = this.normalizeSymbol(input.symbol);
    const resume = this.haltDetectionService.detectResume(symbol);

    if (!resume.resumed) {
      throw new Error(
        `Post-resume revalidation requires a confirmed HALTED to NOT_HALTED transition for ${resume.symbol}`,
      );
    }

    if (resume.currentStatus === null) {
      throw new Error(
        `Post-resume revalidation requires a resume timestamp for ${resume.symbol}`,
      );
    }

    const resumedAt = new Date(resume.currentStatus.timestamp);

    if (!Number.isFinite(resumedAt.getTime())) {
      throw new Error(
        `Post-resume revalidation received an invalid resume timestamp for ${resume.symbol}`,
      );
    }

    const checks = this.normalizeChecks(input.checks, resumedAt);
    const reasons: string[] = [];

    for (const check of checks) {
      if (!check.passed) {
        reasons.push(
          `${check.name} revalidation failed${
            check.reason ? `: ${check.reason}` : ''
          }`,
        );
      }
    }

    return {
      symbol: resume.symbol,
      resumed: true,
      resumedAt,
      valid: reasons.length === 0,
      checks,
      reasons,
    };
  }

  assertValid(input: MarketDataResumeRevalidationInput): void {
    const result = this.evaluate(input);

    if (result.valid) {
      return;
    }

    throw new Error(
      `Post-resume revalidation failed for ${result.symbol}: ${result.reasons.join('; ')}`,
    );
  }

  private normalizeChecks(
    checks: readonly MarketDataResumeRevalidationCheck[],
    resumedAt: Date,
  ): MarketDataResumeRevalidationCheckResult[] {
    const byName = new Map<
      MarketDataResumeRevalidationCheckName,
      MarketDataResumeRevalidationCheck
    >();

    for (const check of checks) {
      this.validateCheckName(check.name);

      if (byName.has(check.name)) {
        throw new Error(
          `Duplicate post-resume revalidation check: ${check.name}`,
        );
      }

      const validatedAt = this.validateTimestamp(
        check.validatedAt,
        check.name,
      );

      if (validatedAt.getTime() <= resumedAt.getTime()) {
        throw new Error(
          `${check.name} revalidation must occur after resume timestamp`,
        );
      }

      byName.set(check.name, {
        ...check,
        validatedAt,
      });
    }

    for (const requiredCheck of MARKET_DATA_RESUME_REVALIDATION_CHECKS) {
      if (!byName.has(requiredCheck)) {
        throw new Error(
          `Missing required post-resume revalidation check: ${requiredCheck}`,
        );
      }
    }

    return MARKET_DATA_RESUME_REVALIDATION_CHECKS.map((name) => {
      const check = byName.get(name);

      if (check === undefined) {
        throw new Error(
          `Missing required post-resume revalidation check: ${name}`,
        );
      }

      return {
        name,
        passed: check.passed,
        validatedAt: new Date(check.validatedAt),
        reason: this.normalizeReason(check.reason),
      };
    });
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error('Invalid post-resume revalidation symbol');
    }

    return normalized;
  }

  private validateCheckName(
    name: MarketDataResumeRevalidationCheckName,
  ): void {
    if (!MARKET_DATA_RESUME_REVALIDATION_CHECKS.includes(name)) {
      throw new Error(
        `Invalid post-resume revalidation check: ${String(name)}`,
      );
    }
  }

  private validateTimestamp(
    timestamp: Date,
    checkName: MarketDataResumeRevalidationCheckName,
  ): Date {
    const milliseconds = timestamp.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error(
        `Invalid ${checkName} post-resume revalidation timestamp`,
      );
    }

    return new Date(milliseconds);
  }

  private normalizeReason(reason: string | undefined): string | null {
    if (reason === undefined) {
      return null;
    }

    const normalized = reason.trim();

    return normalized.length > 0 ? normalized : null;
  }
}