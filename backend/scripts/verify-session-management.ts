import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
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
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');

  const tokenHash = createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');

  const csrfTokenHash = createHash('sha256')
    .update(csrfToken, 'utf8')
    .digest('hex');

  const session = await prisma.authSession.create({
    data: {
      operatorId: 'primary',
      tokenHash,
      csrfTokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const stored = await prisma.authSession.findUniqueOrThrow({
    where: {
      id: session.id,
    },
  });

  if (stored.tokenHash === token) {
    throw new Error('Raw session token was persisted');
  }

  if (stored.tokenHash !== tokenHash) {
    throw new Error('Stored session hash is invalid');
  }

  if (stored.csrfTokenHash === csrfToken) {
    throw new Error('Raw CSRF token was persisted');
  }

  if (stored.csrfTokenHash !== csrfTokenHash) {
    throw new Error('Stored CSRF hash is invalid');
  }

  await prisma.authSession.delete({
    where: {
      id: session.id,
    },
  });

  console.log('Session management verified correctly');
}

main().finally(async () => {
  await prisma.$disconnect();
});
