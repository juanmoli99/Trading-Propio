"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMarketDataTradingStatus = normalizeMarketDataTradingStatus;
function normalizeMarketDataTradingStatus(value, feed, receivedAt = new Date()) {
    if (value.T !== 's') {
        throw new Error('Invalid Alpaca trading status message type');
    }
    const timestamp = requireDate(value.t, 't');
    const receivedAtMs = receivedAt.getTime();
    if (!Number.isFinite(receivedAtMs)) {
        throw new Error('Invalid trading status received timestamp');
    }
    return {
        symbol: requireString(value.S, 'S').toUpperCase(),
        statusCode: requireString(value.sc, 'sc'),
        statusMessage: requireString(value.sm, 'sm', true),
        reasonCode: requireString(value.rc, 'rc', true),
        reasonMessage: requireString(value.rm, 'rm', true),
        timestamp,
        tape: requireString(value.z, 'z', true),
        feed,
        receivedAt: new Date(receivedAtMs),
    };
}
function requireString(value, field, allowEmpty = false) {
    if (typeof value !== 'string') {
        throw new Error(`Invalid Alpaca trading status field: ${field}`);
    }
    const normalized = value.trim();
    if (!allowEmpty && normalized.length === 0) {
        throw new Error(`Invalid Alpaca trading status field: ${field}`);
    }
    return normalized;
}
function requireDate(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca trading status field: ${field}`);
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw new Error(`Invalid Alpaca trading status timestamp: ${field}`);
    }
    return date;
}
