import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CURRENT_REGULATORY_RULES,
  regulatoryRuleSetSchema,
} from './regulatory-rules.schema';
import type {
  RegulatoryRuleSet,
  VersionedRegulatoryRuleSet,
} from './regulatory-rules.types';

const REGULATORY_RULES_KEY = 'regulatory.rules.us.alpaca';

@Injectable()
export class RegulatoryRulesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeIfMissing();
  }

  async getCurrent(): Promise<VersionedRegulatoryRuleSet> {
    const metadata = await this.prisma.systemMetadata.findUnique({
      where: {
        key: REGULATORY_RULES_KEY,
      },
    });

    if (!metadata || metadata.status !== 'ACTIVE') {
      throw new Error('Active regulatory rules are not available');
    }

    return {
      metadataVersion: metadata.version,
      rules: this.parseRules(metadata.value),
    };
  }

  async updateRules(
    rules: RegulatoryRuleSet,
    expectedVersion: number,
  ): Promise<VersionedRegulatoryRuleSet> {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new Error('Invalid expected regulatory rules version');
    }

    const validatedRules = regulatoryRuleSetSchema.parse(rules);

    const value = JSON.stringify(validatedRules);

    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.systemMetadata.findUnique({
        where: {
          key: REGULATORY_RULES_KEY,
        },
      });

      if (!current || current.status !== 'ACTIVE') {
        throw new Error('Active regulatory rules are not available');
      }

      if (current.version !== expectedVersion) {
        throw new Error('Regulatory rules version conflict');
      }

      const updated = await transaction.systemMetadata.updateMany({
        where: {
          id: current.id,
          version: expectedVersion,
          status: 'ACTIVE',
        },
        data: {
          value,
          version: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error('Regulatory rules version conflict');
      }

      await transaction.systemMetadataRevision.create({
        data: {
          systemMetadataId: current.id,
          value,
        },
      });

      return {
        metadataVersion: expectedVersion + 1,
        rules: validatedRules,
      };
    });
  }

  private async initializeIfMissing(): Promise<void> {
    const existing = await this.prisma.systemMetadata.findUnique({
      where: {
        key: REGULATORY_RULES_KEY,
      },
    });

    if (existing) {
      this.parseRules(existing.value);
      return;
    }

    const value = JSON.stringify(CURRENT_REGULATORY_RULES);

    await this.prisma.systemMetadata.create({
      data: {
        key: REGULATORY_RULES_KEY,
        value,
        status: 'ACTIVE',
        revisions: {
          create: {
            value,
          },
        },
      },
    });
  }

  private parseRules(value: string): RegulatoryRuleSet {
    let parsed: unknown;

    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error('Stored regulatory rules contain invalid JSON');
    }

    return regulatoryRuleSetSchema.parse(parsed);
  }
}
