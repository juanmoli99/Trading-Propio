import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: url,
  }),
});

async function main(): Promise<void> {
  const now = new Date();
  const lockedUntil = new Date(
    now.getTime() + 15 * 60 * 1000,
  );

  await prisma.singleOperator.update({
    where: {
      id: 'primary',
    },
    data: {
      failedLoginAttempts: 10,
      failedLoginWindowStartAt: now,
      lastFailedLoginAt: now,
      loginLockedUntil: lockedUntil,
    },
  });

  const operator =
    await prisma.singleOperator.findUniqueOrThrow({
      where: {
        id: 'primary',
      },
      select: {
        failedLoginAttempts: true,
        loginLockedUntil: true,
      },
    });

  const persisted =
    operator.failedLoginAttempts === 10 &&
    operator.loginLockedUntil !== null &&
    operator.loginLockedUntil.getTime() > Date.now();

  await prisma.singleOperator.update({
    where: {
      id: 'primary',
    },
    data: {
      failedLoginAttempts: 0,
      failedLoginWindowStartAt: null,
      lastFailedLoginAt: null,
      loginLockedUntil: null,
    },
  });

  if (!persisted) {
    throw new Error(
      'Persistent brute-force lock verification failed',
    );
  }

  console.log(
    'Persistent brute-force protection verified correctly',
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});

