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
  try {
    await prisma.systemMetadataRevision.create({
      data: {
        systemMetadataId: 'non-existent-id',
        value: 'should-fail',
      },
    });

    console.error('ERROR: referential integrity was not enforced');
    process.exitCode = 1;
  } catch {
    console.log('Referential integrity enforced correctly');
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
