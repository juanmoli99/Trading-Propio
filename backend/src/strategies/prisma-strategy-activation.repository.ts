import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { StrategyActivationRepository } from './strategy-activation.repository';
import type {
  StrategyActivationIdentity,
  StrategyActivationState,
} from './strategy-activation.types';

@Injectable()
export class PrismaStrategyActivationRepository implements StrategyActivationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState> {
    const normalized = this.normalizeIdentity(identity);

    const createResult = await this.prisma.strategyActivationState.createMany({
      data: {
        strategyId: normalized.strategyId,
        strategyVersion: normalized.strategyVersion,
        enabled: true,
      },
      skipDuplicates: true,
    });

    if (createResult.count !== 0 && createResult.count !== 1) {
      throw new Error('Unexpected strategy activation state insert count');
    }

    const record = await this.prisma.strategyActivationState.findUnique({
      where: {
        strategyId_strategyVersion: normalized,
      },
    });

    if (record === null) {
      throw new Error(
        'Strategy activation state could not be recovered after initialization',
      );
    }

    return this.toDomain(record);
  }

  async updateEnabled(
    identity: StrategyActivationIdentity,
    enabled: boolean,
    expectedVersion: number,
  ): Promise<StrategyActivationState> {
    const normalized = this.normalizeIdentity(identity);

    if (typeof enabled !== 'boolean') {
      throw new Error('Invalid strategy activation enabled state');
    }

    this.validateVersion(expectedVersion);

    const result = await this.prisma.strategyActivationState.updateMany({
      where: {
        ...normalized,
        version: expectedVersion,
      },
      data: {
        enabled,
        version: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      const existing = await this.prisma.strategyActivationState.findUnique({
        where: {
          strategyId_strategyVersion: normalized,
        },
      });

      if (existing === null) {
        throw new Error('Strategy activation state not found');
      }

      throw new Error('Strategy activation state version conflict');
    }

    const updated = await this.prisma.strategyActivationState.findUniqueOrThrow(
      {
        where: {
          strategyId_strategyVersion: normalized,
        },
      },
    );

    return this.toDomain(updated);
  }

  private normalizeIdentity(
    identity: StrategyActivationIdentity,
  ): StrategyActivationIdentity {
    return {
      strategyId: this.normalizeStrategyId(identity.strategyId),
      strategyVersion: this.normalizeStrategyVersion(identity.strategyVersion),
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

  private validateVersion(value: number): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        'Strategy activation version must be a non-negative integer',
      );
    }
  }

  private toDomain(record: {
    readonly strategyId: string;
    readonly strategyVersion: string;
    readonly enabled: boolean;
    readonly version: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }): StrategyActivationState {
    this.validateVersion(record.version);

    return {
      strategyId: record.strategyId,
      strategyVersion: record.strategyVersion,
      enabled: record.enabled,
      version: record.version,
      createdAt: new Date(record.createdAt.getTime()),
      updatedAt: new Date(record.updatedAt.getTime()),
    };
  }
}
