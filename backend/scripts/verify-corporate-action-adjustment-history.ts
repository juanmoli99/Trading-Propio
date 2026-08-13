import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { CorporateActionAdjustmentHistoryService } from '../src/corporate-actions/corporate-action-adjustment-history.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await operation();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 191 verification');
  }

  const configService = new ConfigService({
    database: {
      url: databaseUrl,
    },
  });

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const service = new CorporateActionAdjustmentHistoryService(prisma);

  const corporateActionId = `verify-adjustment-${Date.now()}`;

  const processDate = new Date('2026-08-13T00:00:00.000Z');

  const input = {
    corporateActionId,
    corporateActionType: 'forward_split' as const,
    symbol: ' aapl ',
    processDate,
    adjustmentType: 'POST_EVENT_RECONCILIATION' as const,
    status: 'MATCHED',
    details: {
      quantityStatus: 'MATCHED',
      costBasisStatus: 'MATCHED',
      nested: {
        verified: true,
      },
    },
  };

  const created = await service.record(input);

  check(
    'RECORD_CREATED',
    typeof created.id === 'string' && created.id.length > 0,
  );

  check(
    'CORPORATE_ACTION_ID_PRESERVED',
    created.corporateActionId === corporateActionId,
  );

  check(
    'CORPORATE_ACTION_TYPE_PRESERVED',
    created.corporateActionType === 'forward_split',
  );

  check('SYMBOL_NORMALIZED', created.symbol === 'AAPL');

  check(
    'PROCESS_DATE_PRESERVED',
    created.processDate.getTime() === processDate.getTime(),
  );

  check('PROCESS_DATE_DEFENSIVELY_COPIED', created.processDate !== processDate);

  check(
    'ADJUSTMENT_TYPE_PRESERVED',
    created.adjustmentType === 'POST_EVENT_RECONCILIATION',
  );

  check('STATUS_PRESERVED', created.status === 'MATCHED');

  check(
    'DETAILS_PRESERVED',
    created.details.quantityStatus === 'MATCHED' &&
      created.details.costBasisStatus === 'MATCHED',
  );

  check(
    'DETAILS_DEFENSIVELY_COPIED',
    created.details !== input.details &&
      created.details.nested !== input.details.nested,
  );

  check('RECORDED_AT_VALID', Number.isFinite(created.recordedAt.getTime()));

  const persisted = await prisma.corporateActionAdjustmentHistory.findUnique({
    where: {
      id: created.id,
    },
  });

  check('RECORD_PERSISTED', persisted !== null);

  check('PERSISTED_SYMBOL_NORMALIZED', persisted?.symbol === 'AAPL');

  check(
    'PERSISTED_PROCESS_DATE_CORRECT',
    persisted?.processDate.getTime() === processDate.getTime(),
  );

  const second = await service.record({
    ...input,
    adjustmentType: 'SYMBOL_UPDATE',
    status: 'UPDATED',
    details: {
      oldSymbol: 'AAPL',
      newSymbol: 'AAPL2',
    },
  });

  check('APPEND_ONLY_SECOND_RECORD_CREATED', second.id !== created.id);

  const history = await prisma.corporateActionAdjustmentHistory.findMany({
    where: {
      corporateActionId,
    },
    orderBy: {
      recordedAt: 'asc',
    },
  });

  check('TWO_HISTORY_RECORDS_PERSISTED', history.length === 2);

  check(
    'FIRST_HISTORY_RECORD_PRESERVED',
    history[0]?.id === created.id && history[0]?.status === 'MATCHED',
  );

  check(
    'SECOND_HISTORY_RECORD_PRESERVED',
    history[1]?.id === second.id && history[1]?.status === 'UPDATED',
  );

  const nullSymbol = await service.record({
    corporateActionId: `${corporateActionId}-null`,
    corporateActionType: 'cash_dividend',
    symbol: null,
    processDate,
    adjustmentType: 'POST_EVENT_RECONCILIATION',
    status: 'NOT_APPLICABLE',
    details: {},
  });

  check('NULL_SYMBOL_PRESERVED', nullSymbol.symbol === null);

  await expectReject('EMPTY_CORPORATE_ACTION_ID_REJECTED', () =>
    service.record({
      ...input,
      corporateActionId: '   ',
    }),
  );

  await expectReject('INVALID_SYMBOL_REJECTED', () =>
    service.record({
      ...input,
      symbol: 'BAD SYMBOL',
    }),
  );

  await expectReject('INVALID_PROCESS_DATE_REJECTED', () =>
    service.record({
      ...input,
      processDate: new Date(Number.NaN),
    }),
  );

  await expectReject('EMPTY_STATUS_REJECTED', () =>
    service.record({
      ...input,
      status: '   ',
    }),
  );

  await expectReject('INVALID_ADJUSTMENT_TYPE_REJECTED', () =>
    service.record({
      ...input,
      adjustmentType: 'INVALID' as typeof input.adjustmentType,
    }),
  );

  await expectReject('INVALID_DETAILS_REJECTED', () =>
    service.record({
      ...input,
      details: null as unknown as Readonly<Record<string, unknown>>,
    }),
  );

  await prisma.corporateActionAdjustmentHistory.deleteMany({
    where: {
      corporateActionId: {
        startsWith: corporateActionId,
      },
    },
  });

  const remaining = await prisma.corporateActionAdjustmentHistory.count({
    where: {
      corporateActionId: {
        startsWith: corporateActionId,
      },
    },
  });

  check('VERIFICATION_DATA_CLEANED', remaining === 0);

  console.log('PUNTO 191 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exit(1);
  });
