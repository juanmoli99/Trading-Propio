"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAlpacaAsset = normalizeAlpacaAsset;
exports.normalizeAlpacaAssets = normalizeAlpacaAssets;
function normalizeAlpacaAsset(value) {
    return {
        id: requireString(value.id, 'id'),
        assetClass: requireString(value.class, 'class'),
        exchange: requireString(value.exchange, 'exchange'),
        symbol: requireString(value.symbol, 'symbol'),
        name: requireString(value.name, 'name'),
        status: requireString(value.status, 'status'),
        tradable: requireBoolean(value.tradable, 'tradable'),
        fractionable: requireBoolean(value.fractionable, 'fractionable'),
        shortable: requireBoolean(value.shortable, 'shortable'),
        easyToBorrow: requireBoolean(value.easy_to_borrow, 'easy_to_borrow'),
    };
}
function normalizeAlpacaAssets(values) {
    return values.map(normalizeAlpacaAsset);
}
function requireString(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca asset field: ${field}`);
    }
    return value;
}
function requireBoolean(value, field) {
    if (typeof value !== 'boolean') {
        throw new Error(`Invalid Alpaca asset field: ${field}`);
    }
    return value;
}
