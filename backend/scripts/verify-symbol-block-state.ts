import type { SymbolBlacklistService } from '../src/watchlist/symbol-blacklist.service';
import { SymbolBlockStateService } from '../src/watchlist/symbol-block-state.service';
import type { SymbolSuspensionFilterService } from '../src/watchlist/symbol-suspension-filter.service';
import type { SymbolTemporaryBlockService } from '../src/watchlist/symbol-temporary-block.service';
import type { SymbolTradableFilterService } from '../src/watchlist/symbol-tradable-filter.service';
import type { SymbolWhitelistService } from '../src/watchlist/symbol-whitelist.service';

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

function createService(options?: {
  blacklistBlocked?: boolean;
  blacklistReason?: string | null;
  whitelistAllowed?: boolean;
  tradableAllowed?: boolean;
  tradableStatus?: string;
  suspensionAllowed?: boolean;
  suspensionStatus?: string;
  temporaryBlocked?: boolean;
  temporaryReason?: string | null;
  temporaryExpiresAt?: Date | null;
  calls?: string[];
}): SymbolBlockStateService {
  const calls = options?.calls ?? [];

  const blacklistService = {
    async evaluate(symbol: string) {
      calls.push('blacklist');

      return {
        symbol,
        blocked: options?.blacklistBlocked ?? false,
        reason: options?.blacklistReason ?? null,
      };
    },
  } as unknown as SymbolBlacklistService;

  const whitelistService = {
    async evaluate(symbol: string) {
      calls.push('whitelist');

      return {
        symbol,
        whitelistEnabled: true,
        allowed: options?.whitelistAllowed ?? true,
      };
    },
  } as unknown as SymbolWhitelistService;

  const tradableFilter = {
    async evaluate(symbol: string) {
      calls.push('tradable');

      const allowed = options?.tradableAllowed ?? true;

      return {
        symbol,
        allowed,
        status:
          options?.tradableStatus ?? (allowed ? 'ALLOWED' : 'NOT_TRADABLE'),
        tradable: allowed,
        reason: allowed ? 'tradable' : 'not tradable',
      };
    },
  } as unknown as SymbolTradableFilterService;

  const suspensionFilter = {
    async evaluate(symbol: string) {
      calls.push('suspension');

      const allowed = options?.suspensionAllowed ?? true;

      return {
        symbol,
        alpacaStatus: allowed ? 'active' : 'suspended',
        allowed,
        status:
          options?.suspensionStatus ?? (allowed ? 'ALLOWED' : 'SUSPENDED'),
        reason: allowed ? 'active' : 'suspended',
      };
    },
  } as unknown as SymbolSuspensionFilterService;

  const temporaryBlockService = {
    async evaluate(symbol: string, asOf: Date) {
      calls.push('temporary');

      return {
        symbol,
        blocked: options?.temporaryBlocked ?? false,
        reason: options?.temporaryReason ?? null,
        blockedAt: options?.temporaryBlocked
          ? new Date(asOf.getTime() - 1000)
          : null,
        expiresAt: options?.temporaryExpiresAt ?? null,
      };
    },
  } as unknown as SymbolTemporaryBlockService;

  return new SymbolBlockStateService(
    blacklistService,
    whitelistService,
    tradableFilter,
    suspensionFilter,
    temporaryBlockService,
  );
}

async function main(): Promise<void> {
  const allowedCalls: string[] = [];

  const allowedService = createService({
    calls: allowedCalls,
  });

  const allowed = await allowedService.evaluate(
    '  aapl  ',
    new Date('2026-08-13T12:00:00.000Z'),
  );

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('ALLOWED_NOT_BLOCKED', allowed.blocked === false);

  check('ALLOWED_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('ALLOWED_REASON_NULL', allowed.reason === null);

  check(
    'ALLOWED_TEMPORARY_EXPIRATION_NULL',
    allowed.temporaryBlockExpiresAt === null,
  );

  check(
    'ALL_FILTERS_EVALUATED_IN_ORDER',
    allowedCalls.join(',') ===
      'blacklist,whitelist,tradable,suspension,temporary',
  );

  await allowedService.assertAllowed('AAPL');

  check('ASSERT_ALLOWED_PASSES', true);

  const blacklistCalls: string[] = [];

  const blacklistService = createService({
    blacklistBlocked: true,
    blacklistReason: 'manual blacklist',
    whitelistAllowed: false,
    tradableAllowed: false,
    suspensionAllowed: false,
    temporaryBlocked: true,
    calls: blacklistCalls,
  });

  const blacklisted = await blacklistService.evaluate('AAPL');

  check('BLACKLIST_BLOCKED', blacklisted.blocked === true);

  check('BLACKLIST_STATUS_CORRECT', blacklisted.status === 'BLACKLISTED');

  check(
    'BLACKLIST_REASON_PRESERVED',
    blacklisted.reason === 'manual blacklist',
  );

  check(
    'BLACKLIST_HAS_HIGHEST_PRECEDENCE',
    blacklistCalls.join(',') === 'blacklist',
  );

  const whitelistCalls: string[] = [];

  const whitelistService = createService({
    whitelistAllowed: false,
    tradableAllowed: false,
    suspensionAllowed: false,
    temporaryBlocked: true,
    calls: whitelistCalls,
  });

  const notWhitelisted = await whitelistService.evaluate('AAPL');

  check('NOT_WHITELISTED_BLOCKED', notWhitelisted.blocked === true);

  check(
    'NOT_WHITELISTED_STATUS_CORRECT',
    notWhitelisted.status === 'NOT_WHITELISTED',
  );

  check(
    'WHITELIST_PRECEDENCE_CORRECT',
    whitelistCalls.join(',') === 'blacklist,whitelist',
  );

  const tradableCalls: string[] = [];

  const tradableService = createService({
    tradableAllowed: false,
    tradableStatus: 'UNKNOWN_TRADABLE_STATE',
    suspensionAllowed: false,
    temporaryBlocked: true,
    calls: tradableCalls,
  });

  const notTradable = await tradableService.evaluate('AAPL');

  check('NOT_TRADABLE_BLOCKED', notTradable.blocked === true);

  check('NOT_TRADABLE_STATUS_CORRECT', notTradable.status === 'NOT_TRADABLE');

  check(
    'NOT_TRADABLE_REASON_PRESERVES_INNER_STATUS',
    notTradable.reason?.includes('UNKNOWN_TRADABLE_STATE') === true,
  );

  check(
    'TRADABLE_PRECEDENCE_CORRECT',
    tradableCalls.join(',') === 'blacklist,whitelist,tradable',
  );

  const suspensionCalls: string[] = [];

  const suspensionService = createService({
    suspensionAllowed: false,
    suspensionStatus: 'SUSPENDED',
    temporaryBlocked: true,
    calls: suspensionCalls,
  });

  const suspended = await suspensionService.evaluate('AAPL');

  check('SUSPENDED_BLOCKED', suspended.blocked === true);

  check('SUSPENDED_STATUS_CORRECT', suspended.status === 'SUSPENDED');

  check(
    'SUSPENSION_REASON_PRESERVES_INNER_STATUS',
    suspended.reason?.includes('SUSPENDED') === true,
  );

  check(
    'SUSPENSION_PRECEDENCE_CORRECT',
    suspensionCalls.join(',') === 'blacklist,whitelist,tradable,suspension',
  );

  const expiresAt = new Date('2026-08-13T15:00:00.000Z');

  const temporaryCalls: string[] = [];

  const temporaryService = createService({
    temporaryBlocked: true,
    temporaryReason: 'market anomaly',
    temporaryExpiresAt: expiresAt,
    calls: temporaryCalls,
  });

  const temporarilyBlocked = await temporaryService.evaluate(
    'AAPL',
    new Date('2026-08-13T14:00:00.000Z'),
  );

  check('TEMPORARY_BLOCK_BLOCKED', temporarilyBlocked.blocked === true);

  check(
    'TEMPORARY_BLOCK_STATUS_CORRECT',
    temporarilyBlocked.status === 'TEMPORARILY_BLOCKED',
  );

  check(
    'TEMPORARY_BLOCK_REASON_PRESERVED',
    temporarilyBlocked.reason === 'market anomaly',
  );

  check(
    'TEMPORARY_EXPIRATION_PRESERVED',
    temporarilyBlocked.temporaryBlockExpiresAt?.getTime() ===
      expiresAt.getTime(),
  );

  check(
    'TEMPORARY_EXPIRATION_DEFENSIVELY_COPIED',
    temporarilyBlocked.temporaryBlockExpiresAt !== expiresAt,
  );

  check(
    'TEMPORARY_EVALUATED_LAST',
    temporaryCalls.join(',') ===
      'blacklist,whitelist,tradable,suspension,temporary',
  );

  await expectReject('ASSERT_ALLOWED_REJECTS_BLACKLIST', () =>
    blacklistService.assertAllowed('AAPL'),
  );

  await expectReject('ASSERT_ALLOWED_REJECTS_WHITELIST', () =>
    whitelistService.assertAllowed('AAPL'),
  );

  await expectReject('ASSERT_ALLOWED_REJECTS_TRADABLE', () =>
    tradableService.assertAllowed('AAPL'),
  );

  await expectReject('ASSERT_ALLOWED_REJECTS_SUSPENSION', () =>
    suspensionService.assertAllowed('AAPL'),
  );

  await expectReject('ASSERT_ALLOWED_REJECTS_TEMPORARY_BLOCK', () =>
    temporaryService.assertAllowed(
      'AAPL',
      new Date('2026-08-13T14:00:00.000Z'),
    ),
  );

  for (const invalidSymbol of ['', '   ', 'A'.repeat(33)]) {
    let calls = 0;

    const noCallService = createService({
      calls: new Proxy([], {
        get(target, property, receiver) {
          if (property === 'push') {
            return (...items: unknown[]) => {
              calls += items.length;
              return Array.prototype.push.apply(target, items);
            };
          }

          return Reflect.get(target, property, receiver);
        },
      }),
    });

    await expectReject(
      `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalidSymbol)}`,
      () => noCallService.evaluate(invalidSymbol),
    );

    check(
      `INVALID_SYMBOL_SKIPS_FILTERS_${JSON.stringify(invalidSymbol)}`,
      calls === 0,
    );
  }

  const repeatedOne = await allowedService.evaluate(
    'AAPL',
    new Date('2026-08-13T12:00:00.000Z'),
  );

  const repeatedTwo = await allowedService.evaluate(
    'AAPL',
    new Date('2026-08-13T12:00:00.000Z'),
  );

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeatedOne.symbol === repeatedTwo.symbol &&
      repeatedOne.blocked === repeatedTwo.blocked &&
      repeatedOne.status === repeatedTwo.status &&
      repeatedOne.reason === repeatedTwo.reason &&
      repeatedOne.temporaryBlockExpiresAt ===
        repeatedTwo.temporaryBlockExpiresAt,
  );

  console.log('PUNTO 209 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

main().catch((error: unknown) => {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
});

