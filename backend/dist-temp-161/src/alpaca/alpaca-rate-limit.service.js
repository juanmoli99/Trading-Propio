"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaRateLimitService = void 0;
const common_1 = require("@nestjs/common");
const RESET_SAFETY_MARGIN_MS = 50;
let AlpacaRateLimitService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaRateLimitService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaRateLimitService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        limit = null;
        remaining = null;
        resetAt = null;
        consumerRequests = new Map([
            ['SCANNER', 0],
            ['MARKET_DATA', 0],
            ['EXECUTOR', 0],
            ['SYSTEM', 0],
        ]);
        consumerLastRequestAt = new Map([
            ['SCANNER', null],
            ['MARKET_DATA', null],
            ['EXECUTOR', null],
            ['SYSTEM', null],
        ]);
        getSnapshot() {
            return {
                limit: this.limit,
                remaining: this.remaining,
                resetAt: this.resetAt ? new Date(this.resetAt) : null,
            };
        }
        getSharedSnapshot() {
            return {
                limit: this.limit,
                remaining: this.remaining,
                resetAt: this.resetAt ? new Date(this.resetAt) : null,
                consumers: {
                    SCANNER: this.getConsumerUsage('SCANNER'),
                    MARKET_DATA: this.getConsumerUsage('MARKET_DATA'),
                    EXECUTOR: this.getConsumerUsage('EXECUTOR'),
                    SYSTEM: this.getConsumerUsage('SYSTEM'),
                },
            };
        }
        async beforeRequest(consumer) {
            await this.waitIfExhausted();
            this.consumerRequests.set(consumer, (this.consumerRequests.get(consumer) ?? 0) + 1);
            this.consumerLastRequestAt.set(consumer, new Date());
        }
        updateFromHeaders(headers) {
            const limit = this.parseInteger(this.readHeader(headers, 'x-ratelimit-limit'));
            const remaining = this.parseInteger(this.readHeader(headers, 'x-ratelimit-remaining'));
            const resetAt = this.parseResetAt(this.readHeader(headers, 'x-ratelimit-reset'));
            if (limit !== null) {
                this.limit = limit;
            }
            if (remaining !== null) {
                this.remaining = remaining;
            }
            if (resetAt !== null) {
                this.resetAt = resetAt;
            }
        }
        async waitIfExhausted() {
            if (this.remaining === null ||
                this.remaining > 0 ||
                this.resetAt === null) {
                return;
            }
            const delayMs = this.resetAt.getTime() - Date.now() + RESET_SAFETY_MARGIN_MS;
            if (delayMs <= 0) {
                this.remaining = null;
                this.resetAt = null;
                return;
            }
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, delayMs);
                timer.unref?.();
            });
            this.remaining = null;
            this.resetAt = null;
        }
        getConsumerUsage(consumer) {
            const lastRequestAt = this.consumerLastRequestAt.get(consumer) ?? null;
            return {
                requests: this.consumerRequests.get(consumer) ?? 0,
                lastRequestAt: lastRequestAt ? new Date(lastRequestAt) : null,
            };
        }
        readHeader(headers, target) {
            const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === target);
            return entry?.[1];
        }
        parseInteger(value) {
            if (!value) {
                return null;
            }
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed < 0) {
                return null;
            }
            return parsed;
        }
        parseResetAt(value) {
            if (!value) {
                return null;
            }
            const numeric = Number(value);
            if (Number.isFinite(numeric) && numeric > 0) {
                const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
                const date = new Date(milliseconds);
                return Number.isNaN(date.getTime()) ? null : date;
            }
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }
    };
    return AlpacaRateLimitService = _classThis;
})();
exports.AlpacaRateLimitService = AlpacaRateLimitService;
