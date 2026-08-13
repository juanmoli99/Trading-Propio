import { CustomIndicatorRegistryService } from '../src/indicators/custom-indicator-registry.service';
import type { Indicator } from '../src/indicators/indicator.interface';

interface TestInput {
  readonly values: readonly number[];
}

interface TestResult {
  readonly value: number;
}

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  const registry = new CustomIndicatorRegistryService();

  const sumIndicator: Indicator<TestInput, TestResult> = {
    calculate(input: TestInput): TestResult {
      const value = input.values.reduce((total, current) => total + current, 0);

      return { value };
    },
  };

  const lastIndicator: Indicator<TestInput, TestResult> = {
    calculate(input: TestInput): TestResult {
      const value = input.values[input.values.length - 1];

      if (value === undefined) {
        throw new Error('Value is required');
      }

      return { value };
    },
  };

  check('REGISTRY_INITIAL_EMPTY', registry.list().length === 0);

  registry.register('  custom-sum  ', sumIndicator);

  check('REGISTER_NORMALIZES_NAME', registry.has('CUSTOM-SUM'));
  check('LOOKUP_NORMALIZES_NAME', registry.has(' custom-sum '));

  const retrieved = registry.get<TestInput, TestResult>('custom-sum');

  check('REGISTERED_INSTANCE_PRESERVED', retrieved === sumIndicator);

  const calculation = retrieved.calculate({
    values: [10, 20, 30],
  });

  check('CUSTOM_INDICATOR_EXECUTES', calculation.value === 60);

  expectThrow('DUPLICATE_NAME_REJECTED', () => {
    registry.register('CUSTOM-SUM', lastIndicator);
  });

  check(
    'DUPLICATE_DOES_NOT_REPLACE_EXISTING',
    registry.get<TestInput, TestResult>('CUSTOM-SUM') === sumIndicator,
  );

  registry.register('CUSTOM.LAST', lastIndicator);

  check('SECOND_INDICATOR_REGISTERED', registry.has('custom.last'));

  const secondCalculation = registry
    .get<TestInput, TestResult>('CUSTOM.LAST')
    .calculate({
      values: [5, 10, 25],
    });

  check('SECOND_CUSTOM_INDICATOR_EXECUTES', secondCalculation.value === 25);

  registry.register('ZZZ_INDICATOR', sumIndicator);
  registry.register('AAA_INDICATOR', sumIndicator);

  const names = registry.list().map((entry) => entry.name);

  check(
    'LIST_SORTED_BY_NAME',
    names.join('|') ===
      [...names].sort((left, right) => left.localeCompare(right)).join('|'),
  );

  check(
    'LIST_CONTAINS_ALL_REGISTERED',
    names.length === 4 &&
      names.includes('CUSTOM-SUM') &&
      names.includes('CUSTOM.LAST') &&
      names.includes('ZZZ_INDICATOR') &&
      names.includes('AAA_INDICATOR'),
  );

  const listedSum = registry
    .list()
    .find((entry) => entry.name === 'CUSTOM-SUM');

  check(
    'LIST_PRESERVES_INDICATOR_INSTANCE',
    listedSum?.indicator === sumIndicator,
  );

  check('REMOVE_EXISTING_RETURNS_TRUE', registry.remove(' custom-sum '));

  check('REMOVED_INDICATOR_ABSENT', !registry.has('CUSTOM-SUM'));

  expectThrow('GET_REMOVED_INDICATOR_REJECTED', () => {
    registry.get('CUSTOM-SUM');
  });

  check(
    'REMOVE_MISSING_RETURNS_FALSE',
    registry.remove('CUSTOM-SUM') === false,
  );

  expectThrow('GET_MISSING_INDICATOR_REJECTED', () => {
    registry.get('DOES_NOT_EXIST');
  });

  for (const invalidName of ['', '   ']) {
    expectThrow(
      `INVALID_EMPTY_NAME_REJECTED_${JSON.stringify(invalidName)}`,
      () => {
        registry.register(invalidName, sumIndicator);
      },
    );
  }

  expectThrow('NAME_TOO_LONG_REJECTED', () => {
    registry.register('A'.repeat(101), sumIndicator);
  });

  for (const invalidName of [
    'CUSTOM INDICATOR',
    'CUSTOM/INDICATOR',
    '.CUSTOM',
    '-CUSTOM',
    '_CUSTOM',
    'CUSTOM@INDICATOR',
  ]) {
    expectThrow(`INVALID_NAME_REJECTED_${JSON.stringify(invalidName)}`, () => {
      registry.register(invalidName, sumIndicator);
    });
  }

  const beforeInvalidOperations = registry.list().length;

  expectThrow('INVALID_HAS_NAME_REJECTED', () => {
    registry.has('   ');
  });

  expectThrow('INVALID_GET_NAME_REJECTED', () => {
    registry.get('   ');
  });

  expectThrow('INVALID_REMOVE_NAME_REJECTED', () => {
    registry.remove('   ');
  });

  check(
    'INVALID_OPERATIONS_DO_NOT_MUTATE_REGISTRY',
    registry.list().length === beforeInvalidOperations,
  );

  const firstList = registry.list();
  const secondList = registry.list();

  check(
    'REPEATED_LIST_DETERMINISTIC',
    firstList.length === secondList.length &&
      firstList.every(
        (entry, index) =>
          entry.name === secondList[index]?.name &&
          entry.indicator === secondList[index]?.indicator,
      ),
  );

  const deterministicIndicator = registry.get<TestInput, TestResult>(
    'CUSTOM.LAST',
  );

  const deterministicInput = {
    values: [1, 2, 3, 4, 5],
  };

  const firstResult = deterministicIndicator.calculate(deterministicInput);

  const secondResult = deterministicIndicator.calculate(deterministicInput);

  check(
    'CUSTOM_INDICATOR_RESULT_DETERMINISTIC',
    firstResult.value === secondResult.value,
  );

  console.log('PUNTO 229 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
