import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PasswordHashService } from './password-hash.service';

const PRIMARY_OPERATOR_ID = 'primary';

@Injectable()
export class SingleOperatorService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHashService: PasswordHashService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSingleOperator();
  }

  async ensureSingleOperator(): Promise<void> {
    const username =
      this.configService.get<string>('SINGLE_OPERATOR_USERNAME')?.trim() ||
      'admin';

    const displayName =
      this.configService.get<string>('SINGLE_OPERATOR_DISPLAY_NAME')?.trim() ||
      'Primary Operator';

    const operator = await this.prisma.singleOperator.upsert({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      update: {
        username,
        displayName,
      },
      create: {
        id: PRIMARY_OPERATOR_ID,
        username,
        displayName,
      },
    });

    if (!operator.passwordHash) {
      const bootstrapPassword = this.configService.get<string>(
        'SINGLE_OPERATOR_BOOTSTRAP_PASSWORD',
      );

      if (!bootstrapPassword) {
        throw new Error(
          'SINGLE_OPERATOR_BOOTSTRAP_PASSWORD is required until the operator password has been provisioned',
        );
      }

      const passwordHash =
        await this.passwordHashService.hash(bootstrapPassword);

      await this.prisma.singleOperator.update({
        where: {
          id: PRIMARY_OPERATOR_ID,
        },
        data: {
          passwordHash,
        },
      });
    }

    const extraOperators = await this.prisma.singleOperator.count({
      where: {
        id: {
          not: PRIMARY_OPERATOR_ID,
        },
      },
    });

    if (extraOperators > 0) {
      throw new Error(
        'Single-operator invariant violated: multiple operators exist',
      );
    }
  }

  async verifyPassword(password: string): Promise<boolean> {
    const operator = await this.prisma.singleOperator.findUnique({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      select: {
        enabled: true,
        passwordHash: true,
      },
    });

    if (!operator || !operator.enabled || !operator.passwordHash) {
      return false;
    }

    return this.passwordHashService.verify(operator.passwordHash, password);
  }

  async getOperator() {
    return this.prisma.singleOperator.findUniqueOrThrow({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
