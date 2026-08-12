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
exports.RegulatoryAccountConsistencyService = void 0;
const common_1 = require("@nestjs/common");
let RegulatoryAccountConsistencyService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RegulatoryAccountConsistencyService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RegulatoryAccountConsistencyService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        regulatoryRulesService;
        constructor(prisma, regulatoryRulesService) {
            this.prisma = prisma;
            this.regulatoryRulesService = regulatoryRulesService;
        }
        async assertConsistent(account) {
            await this.assertRegulatoryPolicy();
            this.assertDerivedAccountValues(account);
            const snapshot = await this.prisma.alpacaAccountRestrictionSnapshot.findUnique({
                where: {
                    alpacaAccountId: account.id,
                },
            });
            if (!snapshot) {
                throw new Error('Regulatory consistency check failed: local Alpaca account snapshot is missing');
            }
            const mismatches = [];
            this.compare(mismatches, 'accountStatus', snapshot.accountStatus, account.status);
            this.compare(mismatches, 'marginClassification', snapshot.marginClassification, account.marginClassification);
            this.compare(mismatches, 'multiplier', snapshot.multiplier, Number(account.multiplier));
            this.compare(mismatches, 'tradingBlocked', snapshot.tradingBlocked, account.restrictions.tradingBlocked);
            this.compare(mismatches, 'accountBlocked', snapshot.accountBlocked, account.restrictions.accountBlocked);
            this.compare(mismatches, 'transfersBlocked', snapshot.transfersBlocked, account.restrictions.transfersBlocked);
            this.compare(mismatches, 'tradeSuspendedByUser', snapshot.tradeSuspendedByUser, account.restrictions.tradeSuspendedByUser);
            this.compare(mismatches, 'shortingDisabled', snapshot.shortingDisabled, account.restrictions.shortingDisabled);
            this.compare(mismatches, 'leverageDisabled', snapshot.leverageDisabled, account.restrictions.leverageDisabled);
            this.compare(mismatches, 'tradingAllowed', snapshot.tradingAllowed, account.capabilities.tradingAllowed);
            this.compare(mismatches, 'transfersAllowed', snapshot.transfersAllowed, account.capabilities.transfersAllowed);
            this.compare(mismatches, 'shortingAllowed', snapshot.shortingAllowed, account.capabilities.shortingAllowed);
            this.compare(mismatches, 'leverageAllowed', snapshot.leverageAllowed, account.capabilities.leverageAllowed);
            this.compareDecimal(mismatches, 'buyingPower', snapshot.buyingPower.toString(), account.buyingPower);
            this.compareDecimal(mismatches, 'regtBuyingPower', snapshot.regtBuyingPower.toString(), account.regtBuyingPower);
            this.compareDecimal(mismatches, 'nonMarginableBuyingPower', snapshot.nonMarginableBuyingPower.toString(), account.nonMarginableBuyingPower);
            this.compareDecimal(mismatches, 'initialMargin', snapshot.initialMargin.toString(), account.initialMargin);
            this.compareDecimal(mismatches, 'maintenanceMargin', snapshot.maintenanceMargin.toString(), account.maintenanceMargin);
            this.compareDecimal(mismatches, 'lastMaintenanceMargin', snapshot.lastMaintenanceMargin.toString(), account.lastMaintenanceMargin);
            this.compareDecimal(mismatches, 'sma', snapshot.sma.toString(), account.sma);
            if (mismatches.length > 0) {
                throw new Error(`Regulatory account mismatch with Alpaca: ${mismatches.join(', ')}`);
            }
        }
        async assertRegulatoryPolicy() {
            const current = await this.regulatoryRulesService.getCurrent();
            if (current.rules.mismatchPolicy !== 'BLOCK') {
                throw new Error('Regulatory consistency check requires BLOCK mismatch policy');
            }
            if (!current.rules.intradayMargin.enabled ||
                !current.rules.intradayMargin.brokerBuyingPowerAuthoritative ||
                !current.rules.intradayMargin.brokerRestrictionsAuthoritative) {
                throw new Error('Regulatory consistency configuration is not safe for trading');
            }
        }
        assertDerivedAccountValues(account) {
            const multiplier = Number(account.multiplier);
            const expectedClassification = this.classifyMultiplier(multiplier);
            if (account.marginClassification !== expectedClassification) {
                throw new Error('Regulatory local calculation differs from Alpaca margin classification');
            }
            const expectedTradingAllowed = account.status === 'ACTIVE' &&
                !account.tradingBlocked &&
                !account.accountBlocked &&
                !account.tradeSuspendedByUser;
            const expectedTransfersAllowed = account.status === 'ACTIVE' &&
                !account.accountBlocked &&
                !account.transfersBlocked;
            const expectedLeverageAllowed = multiplier > 1;
            const expectedShortingAllowed = expectedTradingAllowed &&
                account.shortingEnabled &&
                expectedLeverageAllowed;
            if (account.capabilities.tradingAllowed !== expectedTradingAllowed ||
                account.capabilities.transfersAllowed !== expectedTransfersAllowed ||
                account.capabilities.leverageAllowed !== expectedLeverageAllowed ||
                account.capabilities.shortingAllowed !== expectedShortingAllowed) {
                throw new Error('Regulatory local capability calculation differs from Alpaca account state');
            }
            if (account.restrictions.shortingDisabled !== !account.shortingEnabled ||
                account.restrictions.leverageDisabled !== !expectedLeverageAllowed) {
                throw new Error('Regulatory local restriction calculation differs from Alpaca account state');
            }
            if (!this.decimalsEqual(account.buyingPowerSummary.effective, account.buyingPower) ||
                !this.decimalsEqual(account.buyingPowerSummary.regT, account.regtBuyingPower) ||
                !this.decimalsEqual(account.buyingPowerSummary.nonMarginable, account.nonMarginableBuyingPower) ||
                account.buyingPowerSummary.intradayMultiplier !== multiplier) {
                throw new Error('Regulatory local buying power summary differs from Alpaca account state');
            }
        }
        classifyMultiplier(multiplier) {
            switch (multiplier) {
                case 1:
                    return 'LIMITED_MARGIN_1X';
                case 2:
                    return 'REG_T_MARGIN_2X';
                case 4:
                    return 'INTRADAY_MARGIN_4X';
                default:
                    throw new Error(`Unsupported Alpaca margin multiplier: ${multiplier}`);
            }
        }
        compare(mismatches, field, localValue, brokerValue) {
            if (localValue !== brokerValue) {
                mismatches.push(field);
            }
        }
        compareDecimal(mismatches, field, localValue, brokerValue) {
            if (!this.decimalsEqual(localValue, brokerValue)) {
                mismatches.push(field);
            }
        }
        decimalsEqual(first, second) {
            const firstNumber = Number(first);
            const secondNumber = Number(second);
            if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
                return false;
            }
            return firstNumber === secondNumber;
        }
    };
    return RegulatoryAccountConsistencyService = _classThis;
})();
exports.RegulatoryAccountConsistencyService = RegulatoryAccountConsistencyService;
