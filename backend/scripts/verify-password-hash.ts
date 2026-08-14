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
  const operator = await prisma.singleOperator.findUniqueOrThrow({
    where: {
      id: 'primary',
    },
    select: {
      passwordHash: true,
    },
  });

  const valid =
    operator.passwordHash?.startsWith('$argon2id$') ?? false;

  console.log(
    valid
      ? 'Argon2id password hash verified correctly'
      : 'ERROR: Password hash is not Argon2id',
  );

  if (!valid) {
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});

