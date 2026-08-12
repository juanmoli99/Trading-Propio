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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaCircuitBreakerService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const alpaca_network_error_1 = require("./alpaca-network.error");
const alpaca_rate_limit_error_1 = require("./alpaca-rate-limit.error");
const alpaca_circuit_open_error_1 = require("./alpaca-circuit-open.error");
let AlpacaCircuitBreakerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaCircuitBreakerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaCircuitBreakerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        failureThreshold;
        openDurationMs;
        state = 'CLOSED';
        consecutiveFailures = 0;
        openedAt = null;
        halfOpenProbeInFlight = false;
        constructor(configService) {
            this.configService = configService;
            this.failureThreshold = this.resolveFailureThreshold();
            this.openDurationMs = this.resolveOpenDurationMs();
        }
        beforeRequest() {
            if (this.state === 'CLOSED') {
                return;
            }
            if (this.state === 'OPEN') {
                const retryAt = this.getRetryAt();
                if (Date.now() < retryAt.getTime()) {
                    throw new alpaca_circuit_open_error_1.AlpacaCircuitOpenError(retryAt);
                }
                this.state = 'HALF_OPEN';
                this.halfOpenProbeInFlight = false;
            }
            if (this.halfOpenProbeInFlight) {
                throw new alpaca_circuit_open_error_1.AlpacaCircuitOpenError(this.getRetryAt());
            }
            this.halfOpenProbeInFlight = true;
        }
        recordSuccess() {
            this.state = 'CLOSED';
            this.consecutiveFailures = 0;
            this.openedAt = null;
            this.halfOpenProbeInFlight = false;
        }
        recordFailure(error) {
            if (!this.shouldCountFailure(error)) {
                this.recordSuccess();
                return;
            }
            this.halfOpenProbeInFlight = false;
            if (this.state === 'HALF_OPEN') {
                this.openCircuit();
                return;
            }
            this.consecutiveFailures += 1;
            if (this.consecutiveFailures >= this.failureThreshold) {
                this.openCircuit();
            }
        }
        getSnapshot() {
            return {
                state: this.state,
                consecutiveFailures: this.consecutiveFailures,
                failureThreshold: this.failureThreshold,
                openedAt: this.openedAt ? new Date(this.openedAt) : null,
                retryAt: this.state === 'OPEN' ? this.getRetryAt() : null,
            };
        }
        openCircuit() {
            this.state = 'OPEN';
            this.openedAt = new Date();
            this.halfOpenProbeInFlight = false;
        }
        getRetryAt() {
            const baseTime = this.openedAt?.getTime() ?? Date.now();
            return new Date(baseTime + this.openDurationMs);
        }
        shouldCountFailure(error) {
            if (error instanceof alpaca_network_error_1.AlpacaNetworkError) {
                return true;
            }
            if (error instanceof alpaca_rate_limit_error_1.AlpacaRateLimitError) {
                return false;
            }
            if (axios_1.default.isAxiosError(error) && error.response) {
                return error.response.status >= 500 && error.response.status <= 599;
            }
            return false;
        }
        resolveFailureThreshold() {
            const value = this.configService.get('operational.alpacaCircuitBreakerFailureThreshold');
            if (value === undefined ||
                !Number.isInteger(value) ||
                value < 1 ||
                value > 50) {
                throw new Error('Invalid Alpaca circuit breaker failure threshold');
            }
            return value;
        }
        resolveOpenDurationMs() {
            const value = this.configService.get('operational.alpacaCircuitBreakerOpenMs');
            if (value === undefined ||
                !Number.isInteger(value) ||
                value < 1000 ||
                value > 300000) {
                throw new Error('Invalid Alpaca circuit breaker open duration');
            }
            return value;
        }
    };
    return AlpacaCircuitBreakerService = _classThis;
})();
exports.AlpacaCircuitBreakerService = AlpacaCircuitBreakerService;
