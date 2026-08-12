"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const market_data_trading_status_service_1 = require("../src/market-data/market-data-trading-status.service");
const service = new market_data_trading_status_service_1.MarketDataTradingStatusService(new config_1.ConfigService({
    app: {
        tradingMode: 'PAPER',
    },
    alpaca: {
        paper: {
            apiKey: 'test-key',
            apiSecret: 'test-secret',
        },
    },
}));
const firstReceivedAt = new Date('2026-08-12T20:00:01.000Z');
const first = service.ingestMessageForVerification({
    T: 's',
    S: 'AAPL',
    sc: 'H',
    sm: 'Trading Halt',
    rc: 'T1',
    rm: 'News Pending',
    t: '2026-08-12T20:00:00.000Z',
    z: 'C',
}, 'sip', firstReceivedAt);
const firstSnapshot = service.getTradingStatus('aapl');
const newer = service.ingestMessageForVerification({
    T: 's',
    S: 'AAPL',
    sc: 'T',
    sm: 'Trading Resumed',
    rc: '',
    rm: '',
    t: '2026-08-12T20:05:00.000Z',
    z: 'C',
}, 'sip', new Date('2026-08-12T20:05:01.000Z'));
service.ingestMessageForVerification({
    T: 's',
    S: 'AAPL',
    sc: 'H',
    sm: 'Older Halt',
    rc: 'T1',
    rm: 'Old event',
    t: '2026-08-12T20:04:59.000Z',
    z: 'C',
}, 'sip', new Date('2026-08-12T20:06:00.000Z'));
const finalSnapshot = service.getTradingStatus('AAPL');
const missingSnapshot = service.getTradingStatus('MSFT');
let invalidTypeRejected = false;
try {
    service.ingestMessageForVerification({
        T: 'q',
        S: 'AAPL',
        sc: 'H',
        sm: 'Invalid',
        rc: '',
        rm: '',
        t: '2026-08-12T20:00:00.000Z',
        z: 'C',
    }, 'sip');
}
catch {
    invalidTypeRejected = true;
}
const assertions = {
    STATUS_NORMALIZED: first.symbol === 'AAPL' &&
        first.statusCode === 'H' &&
        first.statusMessage === 'Trading Halt' &&
        first.reasonCode === 'T1' &&
        first.reasonMessage === 'News Pending' &&
        first.feed === 'sip',
    TIMESTAMP_NORMALIZED: first.timestamp.toISOString() === '2026-08-12T20:00:00.000Z',
    RECEIVED_AT_PRESERVED: first.receivedAt.toISOString() === firstReceivedAt.toISOString(),
    SYMBOL_LOOKUP_NORMALIZED: firstSnapshot.symbol === 'AAPL' &&
        firstSnapshot.status?.statusCode === 'H',
    NEWER_STATUS_ACCEPTED: newer.statusCode === 'T',
    OLDER_STATUS_DOES_NOT_OVERWRITE: finalSnapshot.status?.statusCode === 'T' &&
        finalSnapshot.status.timestamp.toISOString() ===
            '2026-08-12T20:05:00.000Z',
    UNKNOWN_SYMBOL_RETURNS_NULL: missingSnapshot.symbol === 'MSFT' &&
        missingSnapshot.status === null,
    INVALID_MESSAGE_TYPE_REJECTED: invalidTypeRejected,
};
for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
}
if (!Object.values(assertions).every(Boolean)) {
    console.error('PUNTO 155 FALLÓ.');
    process.exit(1);
}
console.log('PUNTO 155 VERIFICADO CORRECTAMENTE.');
