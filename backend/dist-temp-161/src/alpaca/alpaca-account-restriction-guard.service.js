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
exports.AlpacaAccountRestrictionGuardService = void 0;
const common_1 = require("@nestjs/common");
let AlpacaAccountRestrictionGuardService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaAccountRestrictionGuardService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaAccountRestrictionGuardService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        restrictionSyncService;
        regulatoryConsistencyService;
        assetService;
        positionService;
        constructor(restrictionSyncService, regulatoryConsistencyService, assetService, positionService) {
            this.restrictionSyncService = restrictionSyncService;
            this.regulatoryConsistencyService = regulatoryConsistencyService;
            this.assetService = assetService;
            this.positionService = positionService;
        }
        async validateOrder(request) {
            const symbol = request.symbol.trim().toUpperCase();
            const [account, asset, positions] = await Promise.all([
                this.restrictionSyncService.syncFromAlpaca(),
                this.assetService.getAsset(symbol),
                this.positionService.getPositions(),
            ]);
            await this.regulatoryConsistencyService.assertConsistent(account);
            if (!account.capabilities.tradingAllowed) {
                throw new Error('Alpaca account does not currently allow trading');
            }
            if (asset.status !== 'active') {
                throw new Error(`Alpaca asset is not active: ${symbol}`);
            }
            if (!asset.tradable) {
                throw new Error(`Alpaca asset is not tradable: ${symbol}`);
            }
            if (request.quantity !== undefined &&
                this.isFractional(request.quantity) &&
                !asset.fractionable) {
                throw new Error(`Alpaca asset does not allow fractional trading: ${symbol}`);
            }
            if (request.side !== 'sell') {
                return;
            }
            const position = positions.find((item) => item.symbol.trim().toUpperCase() === symbol);
            if (!this.canOrderOpenOrIncreaseShort(request, position?.side, position?.quantity)) {
                return;
            }
            if (!account.capabilities.shortingAllowed) {
                throw new Error('Alpaca account does not currently allow short selling');
            }
            if (!asset.shortable) {
                throw new Error(`Alpaca asset is not shortable: ${symbol}`);
            }
            if (!asset.easyToBorrow) {
                throw new Error(`Alpaca asset is not currently easy to borrow: ${symbol}`);
            }
        }
        canOrderOpenOrIncreaseShort(request, positionSide, positionQuantity) {
            if (positionSide === 'short') {
                return true;
            }
            if (positionSide !== 'long' || positionQuantity === undefined) {
                return true;
            }
            if (request.quantity === undefined) {
                return true;
            }
            const orderQuantity = Number(request.quantity);
            const longQuantity = Math.abs(Number(positionQuantity));
            if (!Number.isFinite(orderQuantity) || !Number.isFinite(longQuantity)) {
                throw new Error('Unable to validate Alpaca position quantity');
            }
            return orderQuantity > longQuantity;
        }
        isFractional(value) {
            return !Number.isInteger(Number(value));
        }
    };
    return AlpacaAccountRestrictionGuardService = _classThis;
})();
exports.AlpacaAccountRestrictionGuardService = AlpacaAccountRestrictionGuardService;
