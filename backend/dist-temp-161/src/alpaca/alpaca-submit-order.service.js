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
exports.AlpacaSubmitOrderService = void 0;
const common_1 = require("@nestjs/common");
const alpaca_order_mapper_1 = require("./alpaca-order.mapper");
let AlpacaSubmitOrderService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaSubmitOrderService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaSubmitOrderService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        httpClient;
        ownershipService;
        accountRestrictionGuard;
        haltDetectionService;
        constructor(httpClient, ownershipService, accountRestrictionGuard, haltDetectionService) {
            this.httpClient = httpClient;
            this.ownershipService = ownershipService;
            this.accountRestrictionGuard = accountRestrictionGuard;
            this.haltDetectionService = haltDetectionService;
        }
        async submitOrder(request) {
            this.assertPaperMode();
            const body = this.buildRequestBody(request);
            this.assertSymbolNotHalted(body.symbol);
            await this.accountRestrictionGuard.validateOrder(request);
            const response = await this.httpClient.request({
                method: 'POST',
                path: '/v2/orders',
                consumer: 'EXECUTOR',
                body,
            });
            const order = (0, alpaca_order_mapper_1.normalizeAlpacaOrder)(response.data);
            await this.ownershipService.registerPlatformOrder(order);
            return order;
        }
        assertSymbolNotHalted(symbol) {
            const halt = this.haltDetectionService.detect(symbol);
            if (halt.state !== 'HALTED') {
                return;
            }
            const reasonCode = halt.haltReason?.code.trim() ?? '';
            const reasonMessage = halt.haltReason?.message.trim() ?? '';
            const reason = reasonCode && reasonMessage
                ? `${reasonCode} - ${reasonMessage}`
                : reasonMessage || reasonCode || 'reason not provided by market data feed';
            const haltedAt = halt.haltedAt?.toISOString() ?? 'timestamp unavailable';
            throw new Error(`New Alpaca order blocked because ${halt.symbol} is halted since ${haltedAt}: ${reason}`);
        }
        buildRequestBody(request) {
            const symbol = this.normalizeSymbol(request.symbol);
            const clientOrderId = this.normalizeClientOrderId(request.clientOrderId);
            this.validateSizing(request);
            this.validateOrderType(request);
            this.validateExtendedHours(request);
            return {
                symbol,
                side: request.side,
                type: request.type,
                time_in_force: request.timeInForce,
                client_order_id: clientOrderId,
                extended_hours: request.extendedHours ?? false,
                qty: request.quantity,
                notional: request.notional,
                limit_price: request.limitPrice,
            };
        }
        validateSizing(request) {
            const hasQuantity = request.quantity !== undefined;
            const hasNotional = request.notional !== undefined;
            if (hasQuantity === hasNotional) {
                throw new Error('Alpaca order requires exactly one of quantity or notional');
            }
            if (request.quantity !== undefined) {
                this.requirePositiveDecimal(request.quantity, 'quantity');
                if (this.isFractional(request.quantity) &&
                    (request.type !== 'market' || request.timeInForce !== 'day')) {
                    throw new Error('Fractional Alpaca orders require market type and day time in force');
                }
            }
            if (request.notional !== undefined) {
                this.requirePositiveDecimal(request.notional, 'notional');
                if (request.type !== 'market' || request.timeInForce !== 'day') {
                    throw new Error('Alpaca notional orders require market type and day time in force');
                }
            }
        }
        validateOrderType(request) {
            if (request.type === 'limit') {
                if (request.limitPrice === undefined) {
                    throw new Error('Alpaca limit order requires limit price');
                }
                this.requirePositiveDecimal(request.limitPrice, 'limitPrice');
                return;
            }
            if (request.limitPrice !== undefined) {
                throw new Error('Alpaca market order cannot contain limit price');
            }
        }
        validateExtendedHours(request) {
            if (!request.extendedHours) {
                return;
            }
            if (request.type !== 'limit') {
                throw new Error('Alpaca extended-hours order must be a limit order');
            }
            if (request.timeInForce !== 'day' && request.timeInForce !== 'gtc') {
                throw new Error('Invalid Alpaca extended-hours time in force');
            }
        }
        assertPaperMode() {
            if (this.httpClient.getTradingMode() !== 'PAPER') {
                throw new Error('Alpaca order submission is disabled outside PAPER mode');
            }
        }
        normalizeSymbol(value) {
            const symbol = value.trim().toUpperCase();
            if (!symbol || symbol.length > 32) {
                throw new Error('Invalid Alpaca order symbol');
            }
            return symbol;
        }
        normalizeClientOrderId(value) {
            const clientOrderId = value.trim();
            if (!clientOrderId || clientOrderId.length > 128) {
                throw new Error('Invalid Alpaca client order ID');
            }
            return clientOrderId;
        }
        requirePositiveDecimal(value, field) {
            if (!value.trim() ||
                !Number.isFinite(Number(value)) ||
                Number(value) <= 0) {
                throw new Error(`Invalid Alpaca order ${field}`);
            }
        }
        isFractional(value) {
            return !Number.isInteger(Number(value));
        }
    };
    return AlpacaSubmitOrderService = _classThis;
})();
exports.AlpacaSubmitOrderService = AlpacaSubmitOrderService;
