"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAlpacaPosition = normalizeAlpacaPosition;
exports.normalizeAlpacaPositions = normalizeAlpacaPositions;
function normalizeAlpacaPosition(value) {
    return {
        assetId: requireString(value.asset_id, 'asset_id'),
        symbol: requireString(value.symbol, 'symbol'),
        exchange: requireString(value.exchange, 'exchange'),
        assetClass: requireString(value.asset_class, 'asset_class'),
        quantity: requireFinancialString(value.qty, 'qty'),
        availableQuantity: optionalFinancialString(value.qty_available, 'qty_available'),
        side: requireString(value.side, 'side'),
        averageEntryPrice: requireFinancialString(value.avg_entry_price, 'avg_entry_price'),
        marketValue: requireFinancialString(value.market_value, 'market_value'),
        costBasis: requireFinancialString(value.cost_basis, 'cost_basis'),
        unrealizedPl: requireFinancialString(value.unrealized_pl, 'unrealized_pl'),
        unrealizedPlPercent: requireFinancialString(value.unrealized_plpc, 'unrealized_plpc'),
        currentPrice: requirePositiveFinancialString(value.current_price, 'current_price'),
        lastDayPrice: optionalPositiveFinancialString(value.lastday_price, 'lastday_price'),
        changeToday: optionalFinancialString(value.change_today, 'change_today'),
    };
}
function normalizeAlpacaPositions(values) {
    return values.map(normalizeAlpacaPosition);
}
function requireString(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca position field: ${field}`);
    }
    return value;
}
function requireFinancialString(value, field) {
    const result = requireString(value, field);
    if (!Number.isFinite(Number(result))) {
        throw new Error(`Invalid Alpaca financial field: ${field}`);
    }
    return result;
}
function optionalFinancialString(value, field) {
    if (value === null || value === undefined) {
        return null;
    }
    return requireFinancialString(value, field);
}
function requirePositiveFinancialString(value, field) {
    const result = requireFinancialString(value, field);
    if (Number(result) <= 0) {
        throw new Error(`Invalid Alpaca positive financial field: ${field}`);
    }
    return result;
}
function optionalPositiveFinancialString(value, field) {
    if (value === null || value === undefined) {
        return null;
    }
    return requirePositiveFinancialString(value, field);
}
