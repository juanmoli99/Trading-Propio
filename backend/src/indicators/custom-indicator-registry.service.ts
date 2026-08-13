import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import type { RegisteredCustomIndicator } from './custom-indicator-registry.types';

@Injectable()
export class CustomIndicatorRegistryService {
  private readonly indicators = new Map<string, Indicator<unknown, unknown>>();

  register<TInput, TOutput>(
    name: string,
    indicator: Indicator<TInput, TOutput>,
  ): void {
    const normalizedName = this.normalizeName(name);

    if (this.indicators.has(normalizedName)) {
      throw new Error(
        `Custom indicator ${normalizedName} is already registered`,
      );
    }

    this.indicators.set(
      normalizedName,
      indicator as Indicator<unknown, unknown>,
    );
  }

  get<TInput, TOutput>(name: string): Indicator<TInput, TOutput> {
    const normalizedName = this.normalizeName(name);

    const indicator = this.indicators.get(normalizedName);

    if (indicator === undefined) {
      throw new Error(`Custom indicator ${normalizedName} is not registered`);
    }

    return indicator as Indicator<TInput, TOutput>;
  }

  has(name: string): boolean {
    const normalizedName = this.normalizeName(name);

    return this.indicators.has(normalizedName);
  }

  remove(name: string): boolean {
    const normalizedName = this.normalizeName(name);

    return this.indicators.delete(normalizedName);
  }

  list(): readonly RegisteredCustomIndicator[] {
    return Array.from(this.indicators.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, indicator]) => ({
        name,
        indicator,
      }));
  }

  private normalizeName(name: string): string {
    const normalized = name.trim().toUpperCase();

    if (!normalized) {
      throw new Error('Custom indicator name is required');
    }

    if (normalized.length > 100) {
      throw new Error('Custom indicator name is too long');
    }

    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(normalized)) {
      throw new Error('Custom indicator name contains invalid characters');
    }

    return normalized;
  }
}
