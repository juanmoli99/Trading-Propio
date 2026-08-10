import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString,
  }),
});

async function acquire(
  key: string,
  ownerId: string,
): Promise<boolean> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30000);

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
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
    RETURNING "id";
  `;

  return rows.length === 1;
}

async function main(): Promise<void> {
  await prisma.persistentLock.deleteMany({
    where: {
      key: 'lock-verification',
    },
  });

  const first = await acquire(
    'lock-verification',
    'owner-a',
  );

  const second = await acquire(
    'lock-verification',
    'owner-b',
  );

  if (!first || second) {
    throw new Error(
      'Persistent lock mutual exclusion failed',
    );
  }

  console.log('Persistent lock enforced correctly');
}

main().finally(async () => {
  await prisma.$disconnect();
});
