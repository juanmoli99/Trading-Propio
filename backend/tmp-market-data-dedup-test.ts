import { MarketDataRequestDedupService } from './src/market-data/market-data-request-dedup.service';

async function main(): Promise<void> {
  const service = new MarketDataRequestDedupService();

  let identicalExecutions = 0;

  const operation = async (): Promise<{ value: number }> => {
    identicalExecutions += 1;

    await new Promise((resolve) => setTimeout(resolve, 100));

    return { value: 123 };
  };

  const identicalResults = await Promise.all([
    service.execute('AAPL', operation),
    service.execute('AAPL', operation),
    service.execute('AAPL', operation),
    service.execute('AAPL', operation),
    service.execute('AAPL', operation),
  ]);

  const afterIdentical = service.getSnapshot();

  console.log(
    'IDENTICAL_SINGLE_EXECUTION:',
    identicalExecutions === 1,
  );

  console.log(
    'IDENTICAL_RESULTS_VALID:',
    identicalResults.every((result) => result.value === 123),
  );

  console.log(
    'FOLLOWERS_REGISTERED:',
    afterIdentical.followers === 4,
  );

  console.log(
    'IN_FLIGHT_CLEANED:',
    afterIdentical.inFlight === 0,
  );

  let differentExecutions = 0;

  await Promise.all([
    service.execute('AAPL-BAR', async () => {
      differentExecutions += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 1;
    }),
    service.execute('MSFT-BAR', async () => {
      differentExecutions += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 2;
    }),
  ]);

  console.log(
    'DIFFERENT_KEYS_INDEPENDENT:',
    differentExecutions === 2,
  );

  let failedExecutions = 0;

  try {
    await service.execute('FAIL', async () => {
      failedExecutions += 1;
      throw new Error('expected failure');
    });
  } catch {
    // Expected.
  }

  const retryResult = await service.execute('FAIL', async () => {
    failedExecutions += 1;
    return 'recovered';
  });

  const finalSnapshot = service.getSnapshot();

  console.log(
    'FAILED_REQUEST_NOT_CACHED:',
    failedExecutions === 2,
  );

  console.log(
    'RETRY_AFTER_FAILURE_WORKS:',
    retryResult === 'recovered',
  );

  console.log(
    'FINAL_IN_FLIGHT_ZERO:',
    finalSnapshot.inFlight === 0,
  );

  console.log(
    'LEADERS:',
    finalSnapshot.leaders,
  );

  console.log(
    'FOLLOWERS:',
    finalSnapshot.followers,
  );
}

void main();
