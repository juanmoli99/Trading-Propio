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
exports.AlpacaRetryBackoffService = void 0;
const common_1 = require("@nestjs/common");
const MAX_BACKOFF_DELAY_MS = 60_000;
let AlpacaRetryBackoffService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaRetryBackoffService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaRetryBackoffService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        baseDelayMs;
        constructor(configService) {
            this.configService = configService;
            this.baseDelayMs = this.resolveBaseDelayMs();
        }
        getBaseDelayMs() {
            return this.baseDelayMs;
        }
        calculateDelayMs(retryNumber) {
            this.validateRetryNumber(retryNumber);
            const exponentialDelay = this.calculateExponentialDelayMs(retryNumber);
            return Math.floor(Math.random() * (exponentialDelay + 1));
        }
        calculateMaximumDelayMs(retryNumber) {
            this.validateRetryNumber(retryNumber);
            return this.calculateExponentialDelayMs(retryNumber);
        }
        calculateExponentialDelayMs(retryNumber) {
            const exponentialDelay = this.baseDelayMs * 2 ** (retryNumber - 1);
            if (!Number.isFinite(exponentialDelay)) {
                return MAX_BACKOFF_DELAY_MS;
            }
            return Math.min(exponentialDelay, MAX_BACKOFF_DELAY_MS);
        }
        validateRetryNumber(retryNumber) {
            if (!Number.isInteger(retryNumber) || retryNumber < 1) {
                throw new Error('Alpaca retry number must be a positive integer');
            }
        }
        resolveBaseDelayMs() {
            const value = this.configService.get('operational.retryBaseDelayMs');
            if (value === undefined ||
                !Number.isInteger(value) ||
                value < 10 ||
                value > 60_000) {
                throw new Error('Invalid Alpaca retry base delay configuration');
            }
            return value;
        }
    };
    return AlpacaRetryBackoffService = _classThis;
})();
exports.AlpacaRetryBackoffService = AlpacaRetryBackoffService;
