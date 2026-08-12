"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaRateLimitError = void 0;
class AlpacaRateLimitError extends Error {
    statusCode = 429;
    resetAt;
    constructor(resetAt, options) {
        super('Alpaca rate limit exceeded', {
            cause: options?.cause,
        });
        this.name = 'AlpacaRateLimitError';
        this.resetAt = resetAt;
    }
}
exports.AlpacaRateLimitError = AlpacaRateLimitError;
