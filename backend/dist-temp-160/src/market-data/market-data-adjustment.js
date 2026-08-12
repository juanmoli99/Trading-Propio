"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_DATA_ADJUSTMENTS = void 0;
exports.normalizeMarketDataAdjustment = normalizeMarketDataAdjustment;
exports.MARKET_DATA_ADJUSTMENTS = [
    'raw',
    'split',
    'dividend',
    'spin-off',
    'all',
];
const COMBINABLE_ADJUSTMENTS = new Set([
    'split',
    'dividend',
    'spin-off',
]);
function normalizeMarketDataAdjustment(value) {
    if (value === undefined) {
        return 'raw';
    }
    const normalized = value.split(',').map((part) => part.trim().toLowerCase());
    if (normalized.length === 0 || normalized.some((part) => part.length === 0)) {
        throw new Error('Invalid market data adjustment');
    }
    if (normalized.length === 1) {
        const adjustment = normalized[0];
        if (adjustment === 'raw' ||
            adjustment === 'split' ||
            adjustment === 'dividend' ||
            adjustment === 'spin-off' ||
            adjustment === 'all') {
            return adjustment;
        }
        throw new Error('Invalid market data adjustment');
    }
    if (normalized.includes('raw') || normalized.includes('all')) {
        throw new Error('raw and all cannot be combined with other market data adjustments');
    }
    const unique = new Set();
    for (const adjustment of normalized) {
        if (!COMBINABLE_ADJUSTMENTS.has(adjustment)) {
            throw new Error('Invalid market data adjustment');
        }
        if (unique.has(adjustment)) {
            throw new Error('Duplicate market data adjustment');
        }
        unique.add(adjustment);
    }
    const canonicalOrder = ['split', 'dividend', 'spin-off'];
    return canonicalOrder
        .filter((adjustment) => unique.has(adjustment))
        .join(',');
}
