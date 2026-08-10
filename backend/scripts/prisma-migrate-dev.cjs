const { spawnSync } = require('node:child_process');

const environment = process.env.NODE_ENV ?? 'development';

if (environment !== 'development') {
  console.error(
    'Refusing to run prisma migrate dev outside development. ' +
      'Use pnpm run db:migrate:deploy for staging/production.',
  );

  process.exit(1);
}

const args = [
  'exec',
  'prisma',
  'migrate',
  'dev',
  ...process.argv.slice(2),
];

const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'pnpm', ...args], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync('pnpm', args, {
        stdio: 'inherit',
        env: process.env,
      });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);