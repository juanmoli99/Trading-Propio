"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMarketDataLuld = normalizeMarketDataLuld;
function normalizeMarketDataLuld(value, feed, receivedAt = new Date()) {
    if (value.T !== 'l') {
        throw new Error('Invalid Alpaca LULD message type');
    }
    const symbol = requireString(value.S, 'S').toUpperCase();
    const limitUp = requirePositiveNumber(value.u, 'u');
    const limitDown = requirePositiveNumber(value.d, 'd');
    const indicator = requireString(value.i, 'i');
    const timestamp = requireDate(value.t, 't');
    const tape = requireString(value.z, 'z');
    if (limitDown >= limitUp) {
        throw new Error('Invalid Alpaca LULD bands: limit down must be below limit up');
    }
    const receivedAtMs = receivedAt.getTime();
    if (!Number.isFinite(receivedAtMs)) {
        throw new Error('Invalid LULD received timestamp');
    }
    return {
        symbol,
        limitUp,
        limitDown,
        indicator,
        timestamp,
        tape,
        feed,
        receivedAt: new Date(receivedAtMs),
    };
}
function requireString(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca LULD field: ${field}`);
    }
    return value.trim();
}
function requirePositiveNumber(value, field) {
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0) {
        throw new Error(`Invalid Alpaca LULD field: ${field}`);
    }
    return value;
}
function requireDate(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca LULD field: ${field}`);
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw new Error(`Invalid Alpaca LULD timestamp: ${field}`);
    }
    return date;
}
