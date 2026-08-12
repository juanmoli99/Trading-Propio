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
exports.AlpacaRetryPolicy = void 0;
const common_1 = require("@nestjs/common");
let AlpacaRetryPolicy = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaRetryPolicy = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaRetryPolicy = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        retryClassifier;
        maxRetries;
        constructor(configService, retryClassifier) {
            this.configService = configService;
            this.retryClassifier = retryClassifier;
            this.maxRetries = this.resolveMaxRetries();
        }
        getMaxRetries() {
            return this.maxRetries;
        }
        evaluate(method, error, retriesAlreadyPerformed) {
            if (retriesAlreadyPerformed >= this.maxRetries) {
                return {
                    retry: false,
                    reason: 'MAX_RETRIES_REACHED',
                    retryNumber: retriesAlreadyPerformed,
                    maxRetries: this.maxRetries,
                };
            }
            if (!this.isSafeMethod(method)) {
                return {
                    retry: false,
                    reason: 'UNSAFE_HTTP_METHOD',
                    retryNumber: retriesAlreadyPerformed,
                    maxRetries: this.maxRetries,
                };
            }
            const classification = this.retryClassifier.classify(error);
            if (!classification.retryable) {
                return {
                    retry: false,
                    reason: 'NON_RETRYABLE_ERROR',
                    retryNumber: retriesAlreadyPerformed,
                    maxRetries: this.maxRetries,
                };
            }
            return {
                retry: true,
                reason: 'RETRY_ALLOWED',
                retryNumber: retriesAlreadyPerformed + 1,
                maxRetries: this.maxRetries,
            };
        }
        isSafeMethod(method) {
            return method === 'GET';
        }
        resolveMaxRetries() {
            const maxRetries = this.configService.get('operational.maxRetries');
            if (maxRetries === undefined ||
                !Number.isInteger(maxRetries) ||
                maxRetries < 0 ||
                maxRetries > 10) {
                throw new Error('Invalid Alpaca retry configuration');
            }
            return maxRetries;
        }
    };
    return AlpacaRetryPolicy = _classThis;
})();
exports.AlpacaRetryPolicy = AlpacaRetryPolicy;
