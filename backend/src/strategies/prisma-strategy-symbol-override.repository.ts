import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { StrategyParameters } from './strategy-parameters.types';
import type { StrategySymbolOverrideRepository } from './strategy-symbol-override.repository';
import type {
  PersistedStrategySymbolOverride,
  StrategySymbolOverride,
  StrategySymbolOverrideIdentity,
} from './strategy-symbol-override.types';
import { StrategyValidationService } from './strategy-validation.service';

@Injectable()
export class PrismaStrategySymbolOverrideRepository implements StrategySymbolOverrideRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: StrategyValidationService,
  ) {}

  async find(
    identity: StrategySymbolOverrideIdentity,
  ): Promise<PersistedStrategySymbolOverride | null> {
    const normalized = this.normalizeIdentity(identity);

    const record = await this.prisma.strategySymbolOverrideState.findUnique({
      where: {
        strategyId_strategyVersion_symbol: normalized,
      },
    });

    return record === null ? null : this.toDomain(record);
  }

  async upsert(
    override: StrategySymbolOverride,
    expectedVersion?: number,
  ): Promise<PersistedStrategySymbolOverride> {
    const identity = this.normalizeIdentity(override);

    const parameters = this.validationService.normalizeStrategyParameters(
      override.parameters,
    );

    if (expectedVersion === undefined) {
      const createResult =
        await this.prisma.strategySymbolOverrideState.createMany({
          data: {
            ...identity,
            parameters: parameters as Prisma.InputJsonValue,
          },
          skipDuplicates: true,
        });

      if (createResult.count !== 0 && createResult.count !== 1) {
        throw new Error('Unexpected strategy symbol override insert count');
      }

      const existing =
        await this.prisma.strategySymbolOverrideState.findUniqueOrThrow({
          where: {
            strategyId_strategyVersion_symbol: identity,
          },
        });

      if (createResult.count === 0) {
        throw new Error(
          'Strategy symbol override already exists; expected version is required',
        );
      }

      return this.toDomain(existing);
    }

    this.validateVersion(expectedVersion);

    const result = await this.prisma.strategySymbolOverrideState.updateMany({
      where: {
        ...identity,
        version: expectedVersion,
      },
      data: {
        parameters: parameters as Prisma.InputJsonValue,
        version: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      const existing = await this.prisma.strategySymbolOverrideState.findUnique(
        {
          where: {
            strategyId_strategyVersion_symbol: identity,
          },
        },
      );

      if (existing === null) {
        throw new Error('Strategy symbol override not found');
      }

      throw new Error('Strategy symbol override version conflict');
    }

    const updated =
      await this.prisma.strategySymbolOverrideState.findUniqueOrThrow({
        where: {
          strategyId_strategyVersion_symbol: identity,
        },
      });

    return this.toDomain(updated);
  }

  async delete(
    identity: StrategySymbolOverrideIdentity,
    expectedVersion: number,
  ): Promise<void> {
    const normalized = this.normalizeIdentity(identity);

    this.validateVersion(expectedVersion);

    const result = await this.prisma.strategySymbolOverrideState.deleteMany({
      where: {
        ...normalized,
        version: expectedVersion,
      },
    });

    if (result.count !== 1) {
      const existing = await this.prisma.strategySymbolOverrideState.findUnique(
        {
          where: {
            strategyId_strategyVersion_symbol: normalized,
          },
        },
      );

      if (existing === null) {
        throw new Error('Strategy symbol override not found');
      }

      throw new Error('Strategy symbol override version conflict');
    }
  }

  private normalizeIdentity(
    identity: StrategySymbolOverrideIdentity,
  ): StrategySymbolOverrideIdentity {
    return {
      strategyId: this.normalizeStrategyId(identity.strategyId),
      strategyVersion: this.normalizeStrategyVersion(identity.strategyVersion),
      symbol: this.normalizeSymbol(identity.symbol),
    };
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

  private validateVersion(value: number): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        'Strategy symbol override version must be a non-negative integer',
      );
    }
  }

  private toDomain(record: {
    readonly strategyId: string;
    readonly strategyVersion: string;
    readonly symbol: string;
    readonly parameters: unknown;
    readonly version: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): PersistedStrategySymbolOverride {
    this.validateVersion(record.version);

    const parameters = this.validationService.normalizeStrategyParameters(
      record.parameters as StrategyParameters,
    );

    return {
      strategyId: record.strategyId,
      strategyVersion: record.strategyVersion,
      symbol: record.symbol,
      parameters,
      version: record.version,
      createdAt: new Date(record.createdAt.getTime()),
      updatedAt: new Date(record.updatedAt.getTime()),
    };
  }
}
