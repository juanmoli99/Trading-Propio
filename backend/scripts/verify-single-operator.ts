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
  const operators = await prisma.singleOperator.findMany();

  console.log({
    count: operators.length,
    operators,
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});

