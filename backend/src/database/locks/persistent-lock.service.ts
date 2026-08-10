import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface LockRow {
  id: string;
  key: string;
  ownerId: string;
  acquiredAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PersistentLockService {
  constructor(private readonly prisma: PrismaService) {}

  async acquire(key: string, ownerId: string, ttlMs: number): Promise<boolean> {
    if (!key.trim()) {
      throw new Error('Lock key is required');
    }

    if (!ownerId.trim()) {
      throw new Error('Lock ownerId is required');
    }

    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
      throw new Error('Lock ttlMs must be a positive integer');
    }

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + ttlMs);

    const rows = await this.prisma.$queryRaw<LockRow[]>`
      INSERT INTO "PersistentLock"
        ("id", "key", "ownerId", "acquiredAt", "expiresAt", "updatedAt")
      VALUES
        (${id}, ${key}, ${ownerId}, NOW(), ${expiresAt}, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "ownerId" = EXCLUDED."ownerId",
        "acquiredAt" = NOW(),
        "expiresAt" = EXCLUDED."expiresAt",
        "updatedAt" = NOW()
      WHERE
        "PersistentLock"."expiresAt" <= NOW()
        OR "PersistentLock"."ownerId" = EXCLUDED."ownerId"
      RETURNING *;
    `;

    return rows.length === 1;
  }

  async renew(key: string, ownerId: string, ttlMs: number): Promise<boolean> {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
      throw new Error('Lock ttlMs must be a positive integer');
    }

    const expiresAt = new Date(Date.now() + ttlMs);

    const result = await this.prisma.persistentLock.updateMany({
      where: {
        key,
        ownerId,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        expiresAt,
      },
    });

    return result.count === 1;
  }

  async release(key: string, ownerId: string): Promise<boolean> {
    const result = await this.prisma.persistentLock.deleteMany({
      where: {
        key,
        ownerId,
      },
    });

    return result.count === 1;
  }
}
