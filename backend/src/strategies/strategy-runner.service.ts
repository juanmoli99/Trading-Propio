import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PersistentLockService } from '../database/locks/persistent-lock.service';
import {
  calculateStrategySignalCooldownEndsAt,
  isStrategySignalCooldownActive,
  normalizeStrategySignalCooldownSeconds,
} from './signal-cooldown';
import {
  calculateStrategySignalFrequencyWindowStart,
  isStrategySignalFrequencyLimitReached,
  normalizeStrategyMaxSignalsPerMinute,
} from './signal-frequency';
import {
  isStrategySignalTotalLimitReached,
  normalizeStrategyMaxSignals,
} from './signal-total-limit';
import { StrategyActivationService } from './strategy-activation.service';
import type {
  PersistedStrategySignal,
  StrategySignalCooldownLookup,
  StrategySignalDeduplicationLookup,
} from './strategy-signal-persistence.types';
import { StrategySignalPersistenceService } from './strategy-signal-persistence.service';
import { StrategySymbolOverrideService } from './strategy-symbol-override.service';
import type {
  StrategyEvaluationContext,
  StrategySignal,
  TradingStrategy,
} from './strategy.types';
import { StrategyValidationService } from './strategy-validation.service';

const SIGNAL_LOCK_TTL_MS = 30_000;
const SIGNAL_COOLDOWN_LOCK_PREFIX = 'strategy-signal-cooldown';
const SIGNAL_FREQUENCY_LOCK_PREFIX = 'strategy-signal-frequency';

@Injectable()
export class StrategyRunnerService {
  constructor(
    private readonly validationService: StrategyValidationService,
    @Optional()
    private readonly persistenceService?: StrategySignalPersistenceService,
    @Optional()
    private readonly persistentLockService?: PersistentLockService,
    @Optional()
    private readonly activationService?: StrategyActivationService,
    @Optional()
    private readonly symbolOverrideService?: StrategySymbolOverrideService,
  ) {}

  async evaluate(
    strategy: TradingStrategy,
    context: StrategyEvaluationContext,
  ): Promise<StrategySignal> {
    this.validationService.validateStrategy(strategy);

    if (this.persistenceService !== undefined) {
      if (this.activationService === undefined) {
        throw new Error(
          'Strategy activation service is required when strategy signal persistence is enabled',
        );
      }

      const activationState = await this.activationService.getState({
        strategyId: strategy.id,
        strategyVersion: strategy.version,
      });

      if (!activationState.enabled) {
        throw new Error(
          `Strategy is disabled: ${activationState.strategyId}@${activationState.strategyVersion}`,
        );
      }
    }

    const normalizedContext = this.validationService.normalizeContext(context);

    const effectiveParameters =
      this.symbolOverrideService === undefined
        ? this.validationService.normalizeStrategyParameters(
            strategy.parameters,
          )
        : await this.symbolOverrideService.resolveForSymbol(
            {
              strategyId: strategy.id,
              strategyVersion: strategy.version,
              symbol: normalizedContext.symbol,
            },
            strategy.parameters,
          );

    const candidate = await strategy.evaluate({
      symbol: normalizedContext.symbol,
      evaluatedAt: new Date(normalizedContext.evaluatedAt.getTime()),
      parameters: effectiveParameters,
    });

    const preliminarySignal = this.validationService.validateSignal(
      randomUUID(),
      new Date(),
      strategy,
      normalizedContext,
      candidate,
    );

    if (this.persistenceService === undefined) {
      return preliminarySignal;
    }

    if (this.persistentLockService === undefined) {
      throw new Error(
        'Persistent lock service is required when strategy signal enforcement is enabled',
      );
    }

    const frequencyLockKey = this.createFrequencyLockKey(preliminarySignal);
    const frequencyLockOwnerId = randomUUID();

    const frequencyLockAcquired = await this.persistentLockService.acquire(
      frequencyLockKey,
      frequencyLockOwnerId,
      SIGNAL_LOCK_TTL_MS,
    );

    if (!frequencyLockAcquired) {
      throw new Error(
        'Strategy signal frequency evaluation is already in progress',
      );
    }

    try {
      const signal = this.validationService.validateSignal(
        randomUUID(),
        new Date(),
        strategy,
        normalizedContext,
        candidate,
      );

      const duplicate =
        await this.persistenceService.getByDeduplicationIdentity(
          this.createDeduplicationLookup(signal),
        );

      if (duplicate !== null) {
        return this.toSignal(duplicate);
      }

      await this.assertFrequencyAllowsSignal(strategy, signal);
      await this.assertTotalLimitAllowsSignal(strategy, signal);

      const cooldownSeconds = normalizeStrategySignalCooldownSeconds(
        strategy.signalCooldownSeconds,
      );

      if (cooldownSeconds === 0) {
        const persisted = await this.persistenceService.persist(signal);

        return this.toSignal(persisted);
      }

      return this.evaluateWithCooldown(
        strategy,
        normalizedContext,
        candidate,
        signal,
        cooldownSeconds,
      );
    } finally {
      const released = await this.persistentLockService.release(
        frequencyLockKey,
        frequencyLockOwnerId,
      );

      if (!released) {
        throw new Error(
          'Strategy signal frequency lock could not be released safely',
        );
      }
    }
  }

  private async assertFrequencyAllowsSignal(
    strategy: TradingStrategy,
    signal: StrategySignal,
  ): Promise<void> {
    if (this.persistenceService === undefined) {
      throw new Error('Strategy signal persistence service is required');
    }

    const maxSignalsPerMinute = normalizeStrategyMaxSignalsPerMinute(
      strategy.maxSignalsPerMinute,
    );

    const windowStart = calculateStrategySignalFrequencyWindowStart(
      signal.signalAt,
    );

    const count = await this.persistenceService.countForFrequency({
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
      windowStart,
      referenceAt: signal.signalAt,
    });

    if (isStrategySignalFrequencyLimitReached(count, maxSignalsPerMinute)) {
      throw new Error(
        `Strategy signal frequency limit reached: ${count}/${maxSignalsPerMinute} signals in the last 60 seconds`,
      );
    }
  }

  private async assertTotalLimitAllowsSignal(
    strategy: TradingStrategy,
    signal: StrategySignal,
  ): Promise<void> {
    if (this.persistenceService === undefined) {
      throw new Error('Strategy signal persistence service is required');
    }

    const maxSignals = normalizeStrategyMaxSignals(strategy.maxSignals);

    const count = await this.persistenceService.countForTotalLimit({
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
    });

    if (isStrategySignalTotalLimitReached(count, maxSignals)) {
      throw new Error(
        `Strategy total signal limit reached: ${count}/${maxSignals} signals`,
      );
    }
  }

  private async evaluateWithCooldown(
    strategy: TradingStrategy,
    context: StrategyEvaluationContext,
    candidate: Parameters<TradingStrategy['evaluate']> extends never
      ? never
      : Awaited<ReturnType<TradingStrategy['evaluate']>>,
    signal: StrategySignal,
    cooldownSeconds: number,
  ): Promise<StrategySignal> {
    if (
      this.persistenceService === undefined ||
      this.persistentLockService === undefined
    ) {
      throw new Error(
        'Strategy signal persistence and lock services are required',
      );
    }

    const lookup = this.createCooldownLookup(signal);
    const lockKey = this.createCooldownLockKey(lookup);
    const lockOwnerId = randomUUID();

    const acquired = await this.persistentLockService.acquire(
      lockKey,
      lockOwnerId,
      SIGNAL_LOCK_TTL_MS,
    );

    if (!acquired) {
      throw new Error(
        'Strategy signal cooldown evaluation is already in progress',
      );
    }

    try {
      const latest = await this.persistenceService.getLatestForCooldown(lookup);

      if (
        latest !== null &&
        latest.evaluatedAt.getTime() === signal.evaluatedAt.getTime()
      ) {
        return this.toSignal(latest);
      }

      if (
        latest !== null &&
        isStrategySignalCooldownActive(
          latest.signalAt,
          signal.signalAt,
          cooldownSeconds,
        )
      ) {
        const cooldownEndsAt = calculateStrategySignalCooldownEndsAt(
          latest.signalAt,
          cooldownSeconds,
        );

        throw new Error(
          `Strategy signal cooldown is active until ${cooldownEndsAt.toISOString()}`,
        );
      }

      const persisted = await this.persistenceService.persist(signal);

      return this.toSignal(persisted);
    } finally {
      const released = await this.persistentLockService.release(
        lockKey,
        lockOwnerId,
      );

      if (!released) {
        throw new Error(
          'Strategy signal cooldown lock could not be released safely',
        );
      }
    }
  }

  private createCooldownLookup(
    signal: StrategySignal,
  ): StrategySignalCooldownLookup {
    return {
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
      symbol: signal.symbol,
      action: signal.action,
    };
  }

  private createDeduplicationLookup(
    signal: StrategySignal,
  ): StrategySignalDeduplicationLookup {
    return {
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
      symbol: signal.symbol,
      action: signal.action,
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
    };
  }

  private createCooldownLockKey(lookup: StrategySignalCooldownLookup): string {
    return [
      SIGNAL_COOLDOWN_LOCK_PREFIX,
      lookup.strategyId,
      lookup.strategyVersion,
      lookup.symbol,
      lookup.action,
    ].join(':');
  }

  private createFrequencyLockKey(signal: StrategySignal): string {
    return [
      SIGNAL_FREQUENCY_LOCK_PREFIX,
      signal.strategyId,
      signal.strategyVersion,
    ].join(':');
  }

  private toSignal(signal: PersistedStrategySignal): StrategySignal {
    return {
      signalId: signal.signalId,
      signalAt: new Date(signal.signalAt.getTime()),
      expiresAt: new Date(signal.expiresAt.getTime()),
      strategyId: signal.strategyId,
      strategyVersion: signal.strategyVersion,
      symbol: signal.symbol,
      action: signal.action,
      evaluatedAt: new Date(signal.evaluatedAt.getTime()),
      confidence: signal.confidence,
      reason: signal.reason,
      invalidation:
        signal.invalidation === null
          ? null
          : {
              invalidatedAt: new Date(
                signal.invalidation.invalidatedAt.getTime(),
              ),
              reason: signal.invalidation.reason,
            },
    };
  }
}
