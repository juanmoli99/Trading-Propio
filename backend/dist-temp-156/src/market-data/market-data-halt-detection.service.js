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
exports.MarketDataHaltDetectionService = void 0;
const common_1 = require("@nestjs/common");
const CTA_HALT_CODES = new Set(['2']);
const UTP_HALT_CODES = new Set(['H', 'P']);
const CTA_NON_HALT_CODES = new Set([
    '3',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'C',
    'D',
    'E',
    'F',
]);
const UTP_NON_HALT_CODES = new Set([
    'Q',
    'T',
]);
let MarketDataHaltDetectionService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MarketDataHaltDetectionService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MarketDataHaltDetectionService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        tradingStatusService;
        constructor(tradingStatusService) {
            this.tradingStatusService = tradingStatusService;
        }
        detect(symbol) {
            const snapshot = this.tradingStatusService.getTradingStatus(symbol);
            if (snapshot.status === null) {
                return {
                    symbol: snapshot.symbol,
                    state: 'UNKNOWN',
                    halted: false,
                    status: null,
                };
            }
            const state = this.classify(snapshot.status);
            return {
                symbol: snapshot.symbol,
                state,
                halted: state === 'HALTED',
                status: this.cloneStatus(snapshot.status),
            };
        }
        classify(status) {
            const tape = status.tape.trim().toUpperCase();
            const statusCode = status.statusCode.trim().toUpperCase();
            if (tape === 'A' || tape === 'B') {
                if (CTA_HALT_CODES.has(statusCode)) {
                    return 'HALTED';
                }
                if (CTA_NON_HALT_CODES.has(statusCode)) {
                    return 'NOT_HALTED';
                }
                return 'UNKNOWN';
            }
            if (tape === 'C' || tape === 'O') {
                if (UTP_HALT_CODES.has(statusCode)) {
                    return 'HALTED';
                }
                if (UTP_NON_HALT_CODES.has(statusCode)) {
                    return 'NOT_HALTED';
                }
                return 'UNKNOWN';
            }
            return 'UNKNOWN';
        }
        isHalted(symbol) {
            return this.detect(symbol).state === 'HALTED';
        }
        assertKnownAndNotHalted(symbol) {
            const result = this.detect(symbol);
            if (result.state === 'HALTED') {
                throw new Error(`Trading halted for symbol ${result.symbol}`);
            }
            if (result.state === 'UNKNOWN') {
                throw new Error(`Trading halt state is unknown for symbol ${result.symbol}`);
            }
        }
        cloneStatus(status) {
            return {
                ...status,
                timestamp: new Date(status.timestamp),
                receivedAt: new Date(status.receivedAt),
            };
        }
    };
    return MarketDataHaltDetectionService = _classThis;
})();
exports.MarketDataHaltDetectionService = MarketDataHaltDetectionService;
