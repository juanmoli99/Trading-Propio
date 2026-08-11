import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const PRIMARY_OPERATOR_ID = 'primary';
const MAX_FAILED_ATTEMPTS = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class LoginProtectionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertLoginAllowed(): Promise<void> {
    const operator = await this.prisma.singleOperator.findUniqueOrThrow({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      select: {
        loginLockedUntil: true,
      },
    });

    if (
      operator.loginLockedUntil &&
      operator.loginLockedUntil.getTime() > Date.now()
    ) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (operator.loginLockedUntil) {
      await this.resetFailures();
    }
  }

  async registerFailure(): Promise<void> {
    const now = new Date();

    const operator = await this.prisma.singleOperator.findUniqueOrThrow({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      select: {
        failedLoginAttempts: true,
        failedLoginWindowStartAt: true,
      },
    });

    const windowExpired =
      !operator.failedLoginWindowStartAt ||
      now.getTime() - operator.failedLoginWindowStartAt.getTime() >
        FAILURE_WINDOW_MS;

    const failedLoginAttempts = windowExpired
      ? 1
      : operator.failedLoginAttempts + 1;

    const failedLoginWindowStartAt = windowExpired
      ? now
      : operator.failedLoginWindowStartAt;

    const loginLockedUntil =
      failedLoginAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCK_DURATION_MS)
        : null;

    await this.prisma.singleOperator.update({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      data: {
        failedLoginAttempts,
        failedLoginWindowStartAt,
        lastFailedLoginAt: now,
        loginLockedUntil,
      },
    });
  }

  async registerSuccess(): Promise<void> {
    await this.resetFailures();
  }

  private async resetFailures(): Promise<void> {
    await this.prisma.singleOperator.update({
      where: {
        id: PRIMARY_OPERATOR_ID,
      },
      data: {
        failedLoginAttempts: 0,
        failedLoginWindowStartAt: null,
        lastFailedLoginAt: null,
        loginLockedUntil: null,
      },
    });
  }
}
