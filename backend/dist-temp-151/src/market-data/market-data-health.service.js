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
exports.MarketDataHealthService = void 0;
const common_1 = require("@nestjs/common");
const MARKET_DATA_HEALTH_COMPONENT = 'market-data:health';
let MarketDataHealthService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MarketDataHealthService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MarketDataHealthService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        operationalState;
        snapshot = {
            status: 'UNAVAILABLE',
            reasons: ['Market data health has not been evaluated'],
            updatedAt: new Date().toISOString(),
        };
        constructor(operationalState) {
            this.operationalState = operationalState;
        }
        evaluate(input) {
            const status = this.resolveStatus(input);
            const reasons = this.normalizeReasons(input.reasons, status);
            const updatedAt = new Date().toISOString();
            this.snapshot = {
                status,
                reasons,
                updatedAt,
            };
            this.operationalState.setComponentState(MARKET_DATA_HEALTH_COMPONENT, status === 'HEALTHY', reasons.length > 0 ? reasons.join('; ') : undefined);
            return this.getSnapshot();
        }
        getSnapshot() {
            return {
                status: this.snapshot.status,
                reasons: [...this.snapshot.reasons],
                updatedAt: this.snapshot.updatedAt,
            };
        }
        getStatus() {
            return this.snapshot.status;
        }
        isEntryBlocked() {
            return (this.snapshot.status === 'STALE' ||
                this.snapshot.status === 'UNAVAILABLE');
        }
        assertEntryAllowed() {
            if (!this.isEntryBlocked()) {
                return;
            }
            const reason = this.snapshot.reasons.length > 0
                ? this.snapshot.reasons.join('; ')
                : 'unknown market data health failure';
            throw new Error(`New entries blocked because market data health is ${this.snapshot.status}: ${reason}`);
        }
        resolveStatus(input) {
            if (!input.available) {
                return 'UNAVAILABLE';
            }
            if (input.inconsistent) {
                return 'INCONSISTENT';
            }
            if (input.stale) {
                return 'STALE';
            }
            return 'HEALTHY';
        }
        normalizeReasons(reasons, status) {
            const normalized = (reasons ?? [])
                .map((reason) => reason.trim())
                .filter((reason) => reason.length > 0);
            if (normalized.length > 0) {
                return [...new Set(normalized)];
            }
            switch (status) {
                case 'UNAVAILABLE':
                    return ['Market data is unavailable'];
                case 'INCONSISTENT':
                    return ['Market data is inconsistent'];
                case 'STALE':
                    return ['Market data is stale'];
                case 'HEALTHY':
                default:
                    return [];
            }
        }
    };
    return MarketDataHealthService = _classThis;
})();
exports.MarketDataHealthService = MarketDataHealthService;
