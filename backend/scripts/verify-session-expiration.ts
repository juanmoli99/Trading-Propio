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
      expiresAt: new Date(Date.now() - 60000),
    },
  });

  const validSession = await prisma.authSession.findFirst({
    where: {
      id: session.id,
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
      operator: {
        enabled: true,
      },
    },
  });

  await prisma.authSession.delete({
    where: {
      id: session.id,
    },
  });

  if (validSession !== null) {
    throw new Error(
      'Expired session was incorrectly accepted',
    );
  }

  console.log(
    'Session expiration enforced correctly',
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});

