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
  const result = await prisma.$transaction(async (tx) => {
    const metadata = await tx.systemMetadata.upsert({
      where: {
        key: 'transaction-probe',
      },
      update: {
        value: 'ok',
      },
      create: {
        key: 'transaction-probe',
        value: 'ok',
      },
    });

    const revision =
      await tx.systemMetadataRevision.create({
        data: {
          systemMetadataId: metadata.id,
          value: metadata.value,
        },
      });

    return {
      metadataId: metadata.id,
      revisionId: revision.id,
    };
  });

  console.log(result);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
