import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

const PRIMARY_OPERATOR_ID = 'primary';
const SESSION_TOKEN_BYTES = 32;
const CSRF_TOKEN_BYTES = 32;
const REAUTH_TTL_MS = 5 * 60 * 1000;

export interface CreatedSession {
  id: string;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(): Promise<CreatedSession> {
    const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');

    const csrfToken = randomBytes(CSRF_TOKEN_BYTES).toString('base64url');

    const tokenHash = this.hashToken(token);
    const csrfTokenHash = this.hashToken(csrfToken);

    const ttlMinutes =
      this.configService.get<number>('auth.sessionTtlMinutes') ?? 720;

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.authSession.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    const session = await this.prisma.authSession.create({
      data: {
        operatorId: PRIMARY_OPERATOR_ID,
        tokenHash,
        csrfTokenHash,
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    return {
      id: session.id,
      token,
      csrfToken,
      expiresAt: session.expiresAt,
    };
  }

  async findValidSession(token: string) {
    if (!token) {
      return null;
    }

    const tokenHash = this.hashToken(token);

    return this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
        operator: {
          enabled: true,
        },
      },
      select: {
        id: true,
        csrfTokenHash: true,
        reauthenticatedUntil: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        operator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            enabled: true,
          },
        },
      },
    });
  }

  async markReauthenticated(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const result = await this.prisma.authSession.updateMany({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        reauthenticatedUntil: new Date(Date.now() + REAUTH_TTL_MS),
      },
    });

    if (result.count !== 1) {
      throw new Error('Unable to reauthenticate invalid session');
    }
  }

  async isRecentlyReauthenticated(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
        reauthenticatedUntil: {
          gt: new Date(),
        },
        operator: {
          enabled: true,
        },
      },
      select: {
        id: true,
      },
    });

    return session !== null;
  }

  async revokeSession(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const tokenHash = this.hashToken(token);

    const result = await this.prisma.authSession.deleteMany({
      where: {
        tokenHash,
        operatorId: PRIMARY_OPERATOR_ID,
      },
    });

    return result.count === 1;
  }

  async revokeAllSessions(): Promise<number> {
    const result = await this.prisma.authSession.deleteMany({
      where: {
        operatorId: PRIMARY_OPERATOR_ID,
      },
    });

    return result.count;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
