import { Inject, Injectable } from '@nestjs/common';
import type {
  StrategyParameterObject,
  StrategyParameters,
  StrategyParameterValue,
} from './strategy-parameters.types';
import {
  STRATEGY_SYMBOL_OVERRIDE_REPOSITORY,
  type StrategySymbolOverrideRepository,
} from './strategy-symbol-override.repository';
import type {
  PersistedStrategySymbolOverride,
  StrategySymbolOverride,
  StrategySymbolOverrideIdentity,
} from './strategy-symbol-override.types';
import { StrategyValidationService } from './strategy-validation.service';

@Injectable()
export class StrategySymbolOverrideService {
  constructor(
    private readonly validationService: StrategyValidationService,
    @Inject(STRATEGY_SYMBOL_OVERRIDE_REPOSITORY)
    private readonly repository: StrategySymbolOverrideRepository,
  ) {}

  normalizeIdentity(
    identity: StrategySymbolOverrideIdentity,
  ): StrategySymbolOverrideIdentity {
    return {
      strategyId: this.normalizeStrategyId(identity.strategyId),
      strategyVersion: this.normalizeStrategyVersion(identity.strategyVersion),
      symbol: this.normalizeSymbol(identity.symbol),
    };
  }

  normalizeOverride(override: StrategySymbolOverride): StrategySymbolOverride {
    const identity = this.normalizeIdentity(override);

    return Object.freeze({
      ...identity,
      parameters: this.validationService.normalizeStrategyParameters(
        override.parameters,
      ),
    });
  }

  async get(
    identity: StrategySymbolOverrideIdentity,
  ): Promise<PersistedStrategySymbolOverride | null> {
    const normalized = this.normalizeIdentity(identity);

    const result = await this.repository.find(normalized);

    return result === null ? null : this.clonePersisted(result);
  }

  async set(
    override: StrategySymbolOverride,
  ): Promise<PersistedStrategySymbolOverride> {
    const normalized = this.normalizeOverride(override);

    const existing = await this.repository.find(normalized);

    const persisted = await this.repository.upsert(
      normalized,
      existing?.version,
    );

    return this.clonePersisted(persisted);
  }

  async remove(identity: StrategySymbolOverrideIdentity): Promise<void> {
    const normalized = this.normalizeIdentity(identity);

    const existing = await this.repository.find(normalized);

    if (existing === null) {
      return;
    }

    await this.repository.delete(normalized, existing.version);
  }

  async resolveForSymbol(
    identity: StrategySymbolOverrideIdentity,
    baseParameters: StrategyParameters,
  ): Promise<StrategyParameters> {
    const override = await this.get(identity);

    return this.resolveParameters(baseParameters, override?.parameters);
  }

  resolveParameters(
    baseParameters: StrategyParameters,
    overrideParameters?: StrategyParameters,
  ): StrategyParameters {
    const normalizedBase =
      this.validationService.normalizeStrategyParameters(baseParameters);

    if (overrideParameters === undefined) {
      return normalizedBase;
    }

    const normalizedOverride =
      this.validationService.normalizeStrategyParameters(overrideParameters);

    const merged = this.mergeObjects(normalizedBase, normalizedOverride);

    return this.validationService.normalizeStrategyParameters(merged);
  }

  private mergeObjects(
    base: StrategyParameterObject,
    override: StrategyParameterObject,
  ): StrategyParameterObject {
    const result: Record<string, StrategyParameterValue> = {};

    for (const [key, value] of Object.entries(base)) {
      result[key] = this.cloneValue(value);
    }

    for (const [key, overrideValue] of Object.entries(override)) {
      const baseValue = base[key];

      if (
        this.isParameterObject(baseValue) &&
        this.isParameterObject(overrideValue)
      ) {
        result[key] = this.mergeObjects(baseValue, overrideValue);

        continue;
      }

      result[key] = this.cloneValue(overrideValue);
    }

    return Object.freeze(result);
  }

  private cloneValue(value: StrategyParameterValue): StrategyParameterValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return Object.freeze(value.map((item) => this.cloneValue(item)));
    }

    const cloned: Record<string, StrategyParameterValue> = {};

    for (const [key, item] of Object.entries(value)) {
      cloned[key] = this.cloneValue(item);
    }

    return Object.freeze(cloned);
  }

  private isParameterObject(
    value: StrategyParameterValue | undefined,
  ): value is StrategyParameterObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeStrategyId(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy ID');
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
      throw new Error('Invalid strategy ID');
    }

    return normalized;
  }

  private normalizeStrategyVersion(value: string): string {
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
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy symbol');
    }

    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid strategy symbol');
    }

    return normalized;
  }

  private clonePersisted(
    value: PersistedStrategySymbolOverride,
  ): PersistedStrategySymbolOverride {
    return {
      strategyId: value.strategyId,
      strategyVersion: value.strategyVersion,
      symbol: value.symbol,
      parameters: this.validationService.normalizeStrategyParameters(
        value.parameters,
      ),
      version: value.version,
      createdAt: new Date(value.createdAt.getTime()),
      updatedAt: new Date(value.updatedAt.getTime()),
    };
  }
}
