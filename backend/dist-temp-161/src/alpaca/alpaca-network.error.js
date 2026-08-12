"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaNetworkError = void 0;
class AlpacaNetworkError extends Error {
    code;
    retryable;
    constructor(code, message, options) {
        super(message, {
            cause: options?.cause,
        });
        this.name = 'AlpacaNetworkError';
        this.code = code;
        this.retryable = options?.retryable ?? true;
    }
}
exports.AlpacaNetworkError = AlpacaNetworkError;
