import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { StrategyMarketEventPolicyHistoryService } from '../src/market-events/strategy-market-event-policy-history.service';
import type { KnownCorporateActionMarketEvent } from '../src/market-events/known-market-event.types';
import type { StrategyMarketEventPolicyResult } from '../src/market-events/strategy-market-event-policy.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 242 verification');
  }

  const configService = new ConfigService({
    database: {
      url: databaseUrl,
    },
  });

  const prisma = new PrismaService(configService);

  await prisma.onModuleInit();

  const service = new StrategyMarketEventPolicyHistoryService(prisma);

  const uniqueSuffix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const strategyId = `verify-242-${uniqueSuffix}`;

  const eventSourceId = `verify-ca-${uniqueSuffix}`;

  let persistedId: string | null = null;

  try {
    const event: KnownCorporateActionMarketEvent = {
      kind: 'CORPORATE_ACTION',
      symbol: 'AAPL',
      eventDate: new Date('2026-08-20T00:00:00.000Z'),
      sourceId: eventSourceId,
      corporateActionType: 'cash_dividend',
    };

    const result: StrategyMarketEventPolicyResult = {
      strategyId,
      symbol: 'AAPL',
      eventKind: 'CORPORATE_ACTION',
      eventDate: new Date('2026-08-20T00:00:00.000Z'),
      asOf: new Date('2026-08-18T12:00:00.000Z'),
      calendarDaysToEvent: 2,
      matchedRuleId: 'dividend-reduction-rule',
      action: 'REDUCE_POSITION_SIZE',
      positionSizeMultiplier: 0.5,
      entryAllowed: true,
      overnightAllowed: true,
      reason:
        'Strategy market-event policy rule dividend-reduction-rule applied action REDUCE_POSITION_SIZE',
    };

    const saved = await service.persist({
      event,
      result,
    });

    persistedId = saved.id;

    check(
      'PERSIST_RETURNED_ID',
      typeof saved.id === 'string' && saved.id.length > 0,
    );

    check('STRATEGY_ID_PERSISTED', saved.strategyId === strategyId);

    check('SYMBOL_PERSISTED', saved.symbol === 'AAPL');

    check('EVENT_KIND_PERSISTED', saved.eventKind === 'CORPORATE_ACTION');

    check(
      'EVENT_DATE_PERSISTED',
      saved.eventDate.toISOString() === '2026-08-20T00:00:00.000Z',
    );

    check('EVENT_SOURCE_ID_PERSISTED', saved.eventSourceId === eventSourceId);

    check(
      'CORPORATE_ACTION_TYPE_PERSISTED',
      saved.corporateActionType === 'cash_dividend',
    );

    check(
      'EVALUATED_AT_PERSISTED',
      saved.evaluatedAt.toISOString() === '2026-08-18T12:00:00.000Z',
    );

    check('CALENDAR_DAYS_PERSISTED', saved.calendarDaysToEvent === 2);

    check(
      'MATCHED_RULE_ID_PERSISTED',
      saved.matchedRuleId === 'dividend-reduction-rule',
    );

    check('ACTION_PERSISTED', saved.action === 'REDUCE_POSITION_SIZE');

    check(
      'POSITION_SIZE_MULTIPLIER_PERSISTED',
      saved.positionSizeMultiplier === 0.5,
    );

    check('ENTRY_ALLOWED_PERSISTED', saved.entryAllowed === true);

    check('OVERNIGHT_ALLOWED_PERSISTED', saved.overnightAllowed === true);

    check('REASON_PERSISTED', saved.reason === result.reason);

    check('CREATED_AT_VALID', Number.isFinite(saved.createdAt.getTime()));

    const rawRecord = await prisma.strategyMarketEventPolicyHistory.findUnique({
      where: {
        id: saved.id,
      },
    });

    check('RECORD_PHYSICALLY_EXISTS_IN_POSTGRESQL', rawRecord !== null);

    if (rawRecord === null) {
      throw new Error('Expected persisted PostgreSQL record');
    }

    check('POSTGRES_STRATEGY_ID_CORRECT', rawRecord.strategyId === strategyId);

    check(
      'POSTGRES_EVENT_SOURCE_ID_CORRECT',
      rawRecord.eventSourceId === eventSourceId,
    );

    check(
      'POSTGRES_ACTION_CORRECT',
      rawRecord.action === 'REDUCE_POSITION_SIZE',
    );

    check(
      'POSTGRES_MULTIPLIER_CORRECT',
      rawRecord.positionSizeMultiplier.toNumber() === 0.5,
    );

    const byStrategy = await service.getHistory({
      strategyId,
      limit: 10,
    });

    check(
      'HISTORY_BY_STRATEGY_FOUND',
      byStrategy.some((record) => record.id === saved.id),
    );

    const recovered = byStrategy.find((record) => record.id === saved.id);

    if (!recovered) {
      throw new Error('Expected persisted history record');
    }

    check(
      'RECOVERED_RECORD_COMPLETE',
      recovered.strategyId === strategyId &&
        recovered.symbol === 'AAPL' &&
        recovered.eventKind === 'CORPORATE_ACTION' &&
        recovered.eventSourceId === eventSourceId &&
        recovered.corporateActionType === 'cash_dividend' &&
        recovered.calendarDaysToEvent === 2 &&
        recovered.matchedRuleId === 'dividend-reduction-rule' &&
        recovered.action === 'REDUCE_POSITION_SIZE' &&
        recovered.positionSizeMultiplier === 0.5 &&
        recovered.entryAllowed === true &&
        recovered.overnightAllowed === true &&
        recovered.reason === result.reason,
    );

    const bySymbol = await service.getHistory({
      symbol: ' aapl ',
      limit: 10,
    });

    check(
      'SYMBOL_FILTER_NORMALIZED',
      bySymbol.some((record) => record.id === saved.id),
    );

    const wrongStrategy = await service.getHistory({
      strategyId: `missing-${uniqueSuffix}`,
      limit: 10,
    });

    check(
      'NON_MATCHING_STRATEGY_EXCLUDED',
      !wrongStrategy.some((record) => record.id === saved.id),
    );

    const sourceEventDate = event.eventDate.getTime();

    const sourceEvaluatedAt = result.asOf.getTime();

    saved.eventDate.setUTCFullYear(2000);
    saved.evaluatedAt.setUTCFullYear(2000);
    saved.createdAt.setUTCFullYear(2000);

    check(
      'SOURCE_EVENT_DATE_NOT_MUTATED',
      event.eventDate.getTime() === sourceEventDate,
    );

    check(
      'SOURCE_AS_OF_NOT_MUTATED',
      result.asOf.getTime() === sourceEvaluatedAt,
    );

    const reread = await service.getHistory({
      strategyId,
      limit: 10,
    });

    const rereadRecord = reread.find((record) => record.id === persistedId);

    if (!rereadRecord) {
      throw new Error('Expected record after defensive-copy mutation');
    }

    check(
      'MUTATING_RETURNED_DATE_DOES_NOT_MUTATE_DB',
      rereadRecord.eventDate.toISOString() === '2026-08-20T00:00:00.000Z' &&
        rereadRecord.evaluatedAt.toISOString() === '2026-08-18T12:00:00.000Z',
    );

    await expectReject('SYMBOL_MISMATCH_REJECTED', async () => {
      await service.persist({
        event: {
          ...event,
          symbol: 'MSFT',
        },
        result,
      });
    });

    await expectReject('EVENT_KIND_MISMATCH_REJECTED', async () => {
      await service.persist({
        event,
        result: {
          ...result,
          eventKind: 'EARNINGS',
        },
      });
    });

    await expectReject('EVENT_DATE_MISMATCH_REJECTED', async () => {
      await service.persist({
        event,
        result: {
          ...result,
          eventDate: new Date('2026-08-21T00:00:00.000Z'),
        },
      });
    });

    await expectReject('INVALID_MULTIPLIER_REJECTED', async () => {
      await service.persist({
        event,
        result: {
          ...result,
          positionSizeMultiplier: 0,
        },
      });
    });

    await expectReject('EMPTY_REASON_REJECTED', async () => {
      await service.persist({
        event,
        result: {
          ...result,
          reason: '   ',
        },
      });
    });

    await expectReject('INVALID_HISTORY_LIMIT_ZERO_REJECTED', async () => {
      await service.getHistory({
        strategyId,
        limit: 0,
      });
    });

    await expectReject('INVALID_HISTORY_LIMIT_TOO_HIGH_REJECTED', async () => {
      await service.getHistory({
        strategyId,
        limit: 1001,
      });
    });

    await expectReject('INVALID_HISTORY_LIMIT_DECIMAL_REJECTED', async () => {
      await service.getHistory({
        strategyId,
        limit: 1.5,
      });
    });

    const firstRead = await service.getHistory({
      strategyId,
      limit: 10,
    });

    const secondRead = await service.getHistory({
      strategyId,
      limit: 10,
    });

    const serialize = (records: typeof firstRead): string =>
      JSON.stringify(
        records.map((record) => ({
          id: record.id,
          strategyId: record.strategyId,
          symbol: record.symbol,
          eventKind: record.eventKind,
          eventDate: record.eventDate.toISOString(),
          eventSourceId: record.eventSourceId,
          corporateActionType: record.corporateActionType,
          evaluatedAt: record.evaluatedAt.toISOString(),
          calendarDaysToEvent: record.calendarDaysToEvent,
          matchedRuleId: record.matchedRuleId,
          action: record.action,
          positionSizeMultiplier: record.positionSizeMultiplier,
          entryAllowed: record.entryAllowed,
          overnightAllowed: record.overnightAllowed,
          reason: record.reason,
          createdAt: record.createdAt.toISOString(),
        })),
      );

    check(
      'REPEATED_HISTORY_READ_DETERMINISTIC',
      serialize(firstRead) === serialize(secondRead),
    );

    console.log('PUNTO 242 VERIFICADO CORRECTAMENTE CONTRA POSTGRESQL.');
  } finally {
    if (persistedId !== null) {
      await prisma.strategyMarketEventPolicyHistory.deleteMany({
        where: {
          id: persistedId,
        },
      });

      const remaining = await prisma.strategyMarketEventPolicyHistory.count({
        where: {
          id: persistedId,
        },
      });

      console.log(`TEST_RECORD_CLEANED_UP: ${remaining === 0}`);
    }

    await prisma.onModuleDestroy();
  }
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
