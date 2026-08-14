import type { StrategySignal } from '../src/strategies/strategy.types';

function createSignal(): StrategySignal {
  return {
    signalId: crypto.randomUUID(),
    signalAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
    strategyId: 'test-strategy',
    strategyVersion: '1.0.0',
    symbol: 'AAPL',
    action: 'BUY',
    evaluatedAt: new Date(),
    confidence: 0.9,
    reason: 'test signal',
    configurationSnapshot: {},
    invalidation: null,
  };
}

const signal = createSignal();

console.log(JSON.stringify(signal, null, 2));
