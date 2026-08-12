"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMarketDataTimeframe = formatMarketDataTimeframe;
exports.validateMarketDataTimeframe = validateMarketDataTimeframe;
function formatMarketDataTimeframe(timeframe) {
    validateMarketDataTimeframe(timeframe);
    return `${timeframe.amount}${timeframe.unit}`;
}
function validateMarketDataTimeframe(timeframe) {
    if (!Number.isInteger(timeframe.amount)) {
        throw new Error('Market data timeframe amount must be an integer');
    }
    switch (timeframe.unit) {
        case 'Min':
            if (timeframe.amount < 1 || timeframe.amount > 59) {
                throw new Error('Minute timeframe must be between 1 and 59');
            }
            return;
        case 'Hour':
            if (timeframe.amount < 1 || timeframe.amount > 23) {
                throw new Error('Hour timeframe must be between 1 and 23');
            }
            return;
        case 'Day':
            if (timeframe.amount !== 1) {
                throw new Error('Day timeframe must be exactly 1Day');
            }
            return;
        case 'Week':
            if (timeframe.amount !== 1) {
                throw new Error('Week timeframe must be exactly 1Week');
            }
            return;
        case 'Month':
            if (![1, 2, 3, 4, 6, 12].includes(timeframe.amount)) {
                throw new Error('Month timeframe must be 1, 2, 3, 4, 6 or 12 months');
            }
            return;
        default:
            throw new Error('Unsupported market data timeframe unit');
    }
}
