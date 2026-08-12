"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaCircuitOpenError = void 0;
class AlpacaCircuitOpenError extends Error {
    retryAt;
    constructor(retryAt) {
        super('Alpaca circuit breaker is open');
        this.name = 'AlpacaCircuitOpenError';
        this.retryAt = retryAt;
    }
}
exports.AlpacaCircuitOpenError = AlpacaCircuitOpenError;
