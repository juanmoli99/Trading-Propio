import { Injectable } from '@nestjs/common';
import { normalizeStrategySignalCooldownSeconds } from './signal-cooldown';
import { normalizeStrategyMaxSignalsPerMinute } from './signal-frequency';
import { normalizeStrategySignalConfidence } from './signal-confidence';
import {
  calculateStrategySignalExpiration,
  normalizeStrategySignalValiditySeconds,
} from './signal-expiration';
import { normalizeStrategySignalReason } from './signal-reason';
import { normalizeStrategyMaxSignals } from './signal-total-limit';
import {
  STRATEGY_SIGNAL_ACTIONS,
  type StrategyEvaluationContext,
  type StrategyParameterObject,
  type StrategyParameters,
  type StrategyParameterValue,
  type StrategyRequiredIndicators,
  type StrategySignal,
  type StrategySignalCandidate,
  type TradingStrategy,
} from './strategy.types';

const MAX_PARAMETER_DEPTH = 8;
const MAX_PARAMETER_KEYS_PER_OBJECT = 64;
const MAX_PARAMETER_ARRAY_LENGTH = 128;
const MAX_PARAMETER_STRING_LENGTH = 4096;

const MAX_REQUIRED_INDICATORS = 64;
const MAX_INDICATOR_NAME_LENGTH = 100;

@Injectable()
export class StrategyValidationService {
  validateStrategy(strategy: TradingStrategy): void {
    this.validateStrategyId(strategy.id);
    this.validateStrategyVersion(strategy.version);

    normalizeStrategySignalValiditySeconds(strategy.signalValiditySeconds);

    normalizeStrategySignalCooldownSeconds(strategy.signalCooldownSeconds);
    normalizeStrategyMaxSignals(strategy.maxSignals);

    normalizeStrategyMaxSignalsPerMinute(strategy.maxSignalsPerMinute);

    this.normalizeStrategyParameters(strategy.parameters);

    this.normalizeRequiredIndicators(strategy.requiredIndicators);

    if (typeof strategy.evaluate !== 'function') {
      throw new Error('Strategy must implement evaluate');
    }
  }

  normalizeRequiredIndicators(
    requiredIndicators: StrategyRequiredIndicators,
  ): StrategyRequiredIndicators {
    if (!Array.isArray(requiredIndicators)) {
      throw new Error('Strategy required indicators must be an array');
    }

    if (requiredIndicators.length > MAX_REQUIRED_INDICATORS) {
      throw new Error(
        `Strategy cannot require more than ${MAX_REQUIRED_INDICATORS} indicators`,
      );
    }

    const normalized: string[] = [];
    const seen = new Set<string>();

    for (const indicator of requiredIndicators) {
      if (typeof indicator !== 'string') {
        throw new Error('Strategy required indicator name must be a string');
      }

      const name = indicator.trim().toUpperCase();

      if (!name) {
        throw new Error('Strategy required indicator name is required');
      }

      if (name.length > MAX_INDICATOR_NAME_LENGTH) {
        throw new Error('Strategy required indicator name is too long');
      }

      if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(name)) {
        throw new Error(
          'Strategy required indicator name contains invalid characters',
        );
      }

      if (seen.has(name)) {
        throw new Error(`Duplicate strategy required indicator: ${name}`);
      }

      seen.add(name);
      normalized.push(name);
    }

    return Object.freeze(normalized);
  }

  normalizeStrategyParameters(
    parameters: StrategyParameters,
  ): StrategyParameters {
    if (!this.isPlainObject(parameters)) {
      throw new Error('Strategy parameters must be a plain object');
    }

    const seen = new Set<object>();

    return this.cloneParameterObject(parameters, 0, seen);
  }

  normalizeContext(
    context: StrategyEvaluationContext,
  ): StrategyEvaluationContext {
    return {
      symbol: this.normalizeSymbol(context.symbol),
      evaluatedAt: this.normalizeDate(context.evaluatedAt, 'evaluation date'),
    };
  }

  validateSignal(
    signalId: string,
    signalAt: Date,
    strategy: TradingStrategy,
    context: StrategyEvaluationContext,
    signal: StrategySignalCandidate,
  ): StrategySignal {
    const normalizedSignalId = this.validateSignalId(signalId);

    const normalizedSignalAt = this.normalizeDate(signalAt, 'signal timestamp');

    const strategyId = this.validateStrategyId(signal.strategyId);

    const strategyVersion = this.validateStrategyVersion(strategy.version);

    const signalValiditySeconds = normalizeStrategySignalValiditySeconds(
      strategy.signalValiditySeconds,
    );

    const expiresAt = calculateStrategySignalExpiration(
      normalizedSignalAt,
      signalValiditySeconds,
    );

    const symbol = this.normalizeSymbol(signal.symbol);

    const evaluatedAt = this.normalizeDate(
      signal.evaluatedAt,
      'signal evaluation date',
    );

    if (strategyId !== strategy.id.trim()) {
      throw new Error('Strategy signal strategy ID does not match strategy');
    }

    if (symbol !== context.symbol) {
      throw new Error(
        'Strategy signal symbol does not match evaluation context',
      );
    }

    if (evaluatedAt.getTime() !== context.evaluatedAt.getTime()) {
      throw new Error('Strategy signal evaluation date does not match context');
    }

    if (!STRATEGY_SIGNAL_ACTIONS.includes(signal.action)) {
      throw new Error('Invalid strategy signal action');
    }

    const confidence = normalizeStrategySignalConfidence(signal.confidence);

    const reason = normalizeStrategySignalReason(signal.reason);

    return {
      signalId: normalizedSignalId,
      signalAt: normalizedSignalAt,
      expiresAt,
      strategyId,
      strategyVersion,
      symbol,
      action: signal.action,
      evaluatedAt,
      confidence,
      reason,
      configurationSnapshot: this.normalizeStrategyParameters(strategy.parameters),
      invalidation: null,
    };
  }

  private cloneParameterObject(
    value: Readonly<Record<string, unknown>>,
    depth: number,
    seen: Set<object>,
  ): StrategyParameterObject {
    this.assertParameterDepth(depth);

    if (seen.has(value)) {
      throw new Error('Strategy parameters cannot contain circular references');
    }

    seen.add(value);

    try {
      const entries = Object.entries(value);

      if (entries.length > MAX_PARAMETER_KEYS_PER_OBJECT) {
        throw new Error(
          `Strategy parameter objects cannot contain more than ${MAX_PARAMETER_KEYS_PER_OBJECT} keys`,
        );
      }

      const result: Record<string, StrategyParameterValue> = {};

      for (const [key, item] of entries) {
        this.validateParameterKey(key);

        result[key] = this.cloneParameterValue(item, depth + 1, seen);
      }

      return Object.freeze(result);
    } finally {
      seen.delete(value);
    }
  }

  private cloneParameterValue(
    value: unknown,
    depth: number,
    seen: Set<object>,
  ): StrategyParameterValue {
    this.assertParameterDepth(depth);

    if (value === null) {
      return null;
    }

    if (typeof value === 'string') {
      if (value.length > MAX_PARAMETER_STRING_LENGTH) {
        throw new Error(
          `Strategy parameter strings cannot exceed ${MAX_PARAMETER_STRING_LENGTH} characters`,
        );
      }

      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Strategy numeric parameters must be finite');
      }

      return value;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_PARAMETER_ARRAY_LENGTH) {
        throw new Error(
          `Strategy parameter arrays cannot contain more than ${MAX_PARAMETER_ARRAY_LENGTH} items`,
        );
      }

      if (seen.has(value)) {
        throw new Error(
          'Strategy parameters cannot contain circular references',
        );
      }

      seen.add(value);

      try {
        return Object.freeze(
          value.map((item) => this.cloneParameterValue(item, depth + 1, seen)),
        );
      } finally {
        seen.delete(value);
      }
    }

    if (this.isPlainObject(value)) {
      return this.cloneParameterObject(value, depth, seen);
    }

    throw new Error('Strategy parameters must contain only JSON-safe values');
  }

  private assertParameterDepth(depth: number): void {
    if (depth > MAX_PARAMETER_DEPTH) {
      throw new Error(
        `Strategy parameters cannot exceed depth ${MAX_PARAMETER_DEPTH}`,
      );
    }
  }

  private validateParameterKey(value: string): void {
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(value)) {
      throw new Error('Invalid strategy parameter key');
    }
  }

  private isPlainObject(
    value: unknown,
  ): value is Readonly<Record<string, unknown>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
  }

  private validateSignalId(value: string): string {
    const normalized = value.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalized,
      )
    ) {
      throw new Error('Invalid strategy signal ID');
    }

    return normalized.toLowerCase();
  }

  private validateStrategyId(value: string): string {
    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
      throw new Error('Invalid strategy ID');
    }

    return normalized;
  }

  private validateStrategyVersion(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy version');
    }

    const normalized = value.trim();

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(normalized)) {
      throw new Error('Invalid strategy version');
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid strategy symbol');
    }

    return normalized;
  }

  private normalizeDate(value: Date, field: string): Date {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new Error(`Invalid strategy ${field}`);
    }

    return new Date(value.getTime());
  }
}


