import 'dotenv/config';
import axios from 'axios';
import { normalizeFinnhubEarningsCalendarResponse } from '../src/market-events/finnhub-earnings.mapper';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();

  check('FINNHUB_API_KEY_PRESENT', Boolean(apiKey));

  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is required');
  }

  const baseUrl =
    process.env.FINNHUB_BASE_URL?.trim() || 'https://finnhub.io/api/v1';

  const timeoutMs = Number(process.env.FINNHUB_TIMEOUT_MS ?? 10000);

  check(
    'FINNHUB_TIMEOUT_VALID',
    Number.isInteger(timeoutMs) && timeoutMs >= 100 && timeoutMs <= 120000,
  );

  const startDate = new Date();
  const endDate = new Date(startDate.getTime());

  endDate.setUTCDate(endDate.getUTCDate() + 365);

  const start = toDateString(startDate);
  const end = toDateString(endDate);

  const response = await axios.get<unknown>(`${baseUrl}/calendar/earnings`, {
    params: {
      from: start,
      to: end,
      symbol: 'AAPL',
    },
    headers: {
      'X-Finnhub-Token': apiKey,
    },
    timeout: timeoutMs,
  });

  check(
    'FINNHUB_HTTP_STATUS_OK',
    response.status >= 200 && response.status < 300,
  );

  check(
    'FINNHUB_RESPONSE_OBJECT',
    typeof response.data === 'object' &&
      response.data !== null &&
      !Array.isArray(response.data),
  );

  const events = normalizeFinnhubEarningsCalendarResponse(response.data);

  check('FINNHUB_RESPONSE_NORMALIZED', Array.isArray(events));

  check('AAPL_EARNINGS_FOUND', events.length > 0);

  check(
    'ALL_SYMBOLS_AAPL',
    events.every((event) => event.symbol === 'AAPL'),
  );

  check(
    'ALL_REPORT_DATES_VALID',
    events.every((event) => /^\d{4}-\d{2}-\d{2}$/.test(event.reportDate)),
  );

  check(
    'ALL_SESSIONS_VALID',
    events.every((event) =>
      ['PRE_MARKET', 'DURING_MARKET', 'POST_MARKET', 'UNKNOWN'].includes(
        event.session,
      ),
    ),
  );

  const futureEvents = events
    .filter((event) => event.reportDate >= start)
    .sort((left, right) => left.reportDate.localeCompare(right.reportDate));

  check('FUTURE_AAPL_EARNINGS_FOUND', futureEvents.length > 0);

  const next = futureEvents[0];

  if (!next) {
    throw new Error('Expected next AAPL earnings');
  }

  check('NEXT_EARNINGS_SYMBOL_CORRECT', next.symbol === 'AAPL');

  check('NEXT_EARNINGS_NOT_IN_PAST', next.reportDate >= start);

  check('NEXT_EARNINGS_WITHIN_LOOKAHEAD', next.reportDate <= end);

  console.log(`NEXT_EARNINGS_DATE: ${next.reportDate}`);

  console.log(`NEXT_EARNINGS_SESSION: ${next.session}`);

  console.log('PUNTOS 231-232 VERIFICADOS CONTRA FINNHUB REAL.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error(
        'FINNHUB_HTTP_ERROR:',
        error.response?.status ?? error.code ?? 'UNKNOWN',
      );

      console.error('FINNHUB_RESPONSE:', error.response?.data ?? error.message);
    } else {
      console.error(error);
    }

    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
