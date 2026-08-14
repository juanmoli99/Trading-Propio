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

async function main(): Promise<void> {
  const record = await prisma.systemMetadata.upsert({
    where: {
      key: 'optimistic-concurrency-probe',
    },
    update: {
      value: 'initial',
      version: 0,
    },
    create: {
      key: 'optimistic-concurrency-probe',
      value: 'initial',
    },
  });

  const expectedVersion = record.version;

  const firstUpdate = await prisma.systemMetadata.updateMany({
    where: {
      id: record.id,
      version: expectedVersion,
    },
    data: {
      value: 'first-update',
      version: {
        increment: 1,
      },
    },
  });

  const staleUpdate = await prisma.systemMetadata.updateMany({
    where: {
      id: record.id,
      version: expectedVersion,
    },
    data: {
      value: 'stale-update',
      version: {
        increment: 1,
      },
    },
  });

  if (firstUpdate.count !== 1) {
    throw new Error('First optimistic update did not succeed');
  }

  if (staleUpdate.count !== 0) {
    throw new Error(
      'Stale optimistic update was not rejected',
    );
  }

  console.log('Optimistic concurrency enforced correctly');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

