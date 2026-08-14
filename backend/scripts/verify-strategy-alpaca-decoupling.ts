import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const STRATEGIES_DIRECTORY = resolve(process.cwd(), 'src', 'strategies');

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*\/alpaca(?:\/|['"])/,
  /import\s*\(\s*['"][^'"]*\/alpaca(?:\/|['"])/,
  /require\s*\(\s*['"][^'"]*\/alpaca(?:\/|['"])/,
];

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function collectTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);

    if (statSync(fullPath).isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));

      continue;
    }

    if (extname(fullPath) === '.ts') {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function hasForbiddenAlpacaDependency(source: string): boolean {
  return FORBIDDEN_IMPORT_PATTERNS.some((pattern) => pattern.test(source));
}

function main(): void {
  const files = collectTypeScriptFiles(STRATEGIES_DIRECTORY);

  check('STRATEGY_FILES_FOUND', files.length > 0);

  let forbiddenDependencyFound = false;

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    const clean = !hasForbiddenAlpacaDependency(source);

    console.log(
      `NO_ALPACA_DEPENDENCY_${relative(STRATEGIES_DIRECTORY, file)
        .replaceAll('\\', '/')
        .replaceAll('.', '_')
        .replaceAll('-', '_')
        .toUpperCase()}: ${clean}`,
    );

    if (!clean) {
      forbiddenDependencyFound = true;
    }
  }

  check('NO_STRATEGY_IMPORTS_ALPACA', !forbiddenDependencyFound);

  const forbiddenSamples = [
    "import { AlpacaHttpClient } from '../alpaca/alpaca-http-client.service';",
    "import type { AlpacaPosition } from '../../alpaca/alpaca-position.types';",
    "const module = import('../alpaca/alpaca.module');",
    "const module = require('../alpaca/alpaca.module');",
  ];

  for (const sample of forbiddenSamples) {
    check(
      'FORBIDDEN_ALPACA_IMPORT_DETECTED',
      hasForbiddenAlpacaDependency(sample),
    );
  }

  const allowedSamples = [
    "import type { Indicator } from '../indicators/indicator.types';",
    "import type { MarketBar } from '../market-data/market-data.types';",
    "import type { TradingStrategy } from './strategy.types';",
  ];

  for (const sample of allowedSamples) {
    check(
      'NON_ALPACA_DEPENDENCY_ALLOWED',
      !hasForbiddenAlpacaDependency(sample),
    );
  }

  const firstScan = files.map((file) => ({
    file: relative(STRATEGIES_DIRECTORY, file),
    source: readFileSync(file, 'utf8'),
  }));

  const secondScan = files.map((file) => ({
    file: relative(STRATEGIES_DIRECTORY, file),
    source: readFileSync(file, 'utf8'),
  }));

  check(
    'DEPENDENCY_SCAN_DETERMINISTIC',
    JSON.stringify(firstScan) === JSON.stringify(secondScan),
  );

  console.log('PUNTO 244 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

