"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAlpacaAccount = normalizeAlpacaAccount;
function normalizeAlpacaAccount(value) {
    const status = requireString(value.status, 'status');
    const tradingBlocked = requireBoolean(value.trading_blocked, 'trading_blocked');
    const accountBlocked = requireBoolean(value.account_blocked, 'account_blocked');
    const transfersBlocked = requireBoolean(value.transfers_blocked, 'transfers_blocked');
    const tradeSuspendedByUser = requireBoolean(value.trade_suspended_by_user, 'trade_suspended_by_user');
    const shortingEnabled = requireBoolean(value.shorting_enabled, 'shorting_enabled');
    const multiplier = requireMarginMultiplier(value.multiplier, 'multiplier');
    const buyingPower = requireNonNegativeFinancialString(value.buying_power, 'buying_power');
    const regtBuyingPower = requireNonNegativeFinancialString(value.regt_buying_power, 'regt_buying_power');
    const nonMarginableBuyingPower = requireNonNegativeFinancialString(value.non_marginable_buying_power, 'non_marginable_buying_power');
    const initialMargin = requireNonNegativeFinancialString(value.initial_margin, 'initial_margin');
    const maintenanceMargin = requireNonNegativeFinancialString(value.maintenance_margin, 'maintenance_margin');
    const lastMaintenanceMargin = requireNonNegativeFinancialString(value.last_maintenance_margin, 'last_maintenance_margin');
    const sma = requireFinancialString(value.sma, 'sma');
    const tradingAllowed = status === 'ACTIVE' &&
        !tradingBlocked &&
        !accountBlocked &&
        !tradeSuspendedByUser;
    const transfersAllowed = status === 'ACTIVE' && !accountBlocked && !transfersBlocked;
    const leverageAllowed = Number(multiplier) > 1;
    const shortingAllowed = tradingAllowed && shortingEnabled && leverageAllowed;
    return {
        id: requireString(value.id, 'id'),
        status,
        currency: requireString(value.currency, 'currency'),
        cash: requireFinancialString(value.cash, 'cash'),
        equity: requireFinancialString(value.equity, 'equity'),
        buyingPower,
        portfolioValue: requireFinancialString(value.portfolio_value, 'portfolio_value'),
        tradingBlocked,
        accountBlocked,
        transfersBlocked,
        tradeSuspendedByUser,
        shortingEnabled,
        multiplier,
        regtBuyingPower,
        nonMarginableBuyingPower,
        initialMargin,
        maintenanceMargin,
        lastMaintenanceMargin,
        sma,
        accountType: 'MARGIN',
        marginClassification: classifyMarginMultiplier(multiplier),
        restrictions: {
            tradingBlocked,
            accountBlocked,
            transfersBlocked,
            tradeSuspendedByUser,
            shortingDisabled: !shortingEnabled,
            leverageDisabled: !leverageAllowed,
        },
        capabilities: {
            tradingAllowed,
            transfersAllowed,
            shortingAllowed,
            leverageAllowed,
        },
        buyingPowerSummary: {
            effective: buyingPower,
            regT: regtBuyingPower,
            nonMarginable: nonMarginableBuyingPower,
            intradayMultiplier: Number(multiplier),
            overnightMultiplier: resolveOvernightMultiplier(multiplier),
        },
        marginRequirements: {
            initial: initialMargin,
            maintenance: maintenanceMargin,
            previousMaintenance: lastMaintenanceMargin,
            specialMemorandumAccount: sma,
        },
        tradingAllowed,
    };
}
function classifyMarginMultiplier(multiplier) {
    switch (multiplier) {
        case '1':
            return 'LIMITED_MARGIN_1X';
        case '2':
            return 'REG_T_MARGIN_2X';
        case '4':
            return 'INTRADAY_MARGIN_4X';
        default:
            throw new Error(`Unsupported Alpaca margin multiplier: ${multiplier}`);
    }
}
function resolveOvernightMultiplier(multiplier) {
    if (multiplier === '4') {
        return 2;
    }
    return Number(multiplier);
}
function requireString(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid Alpaca account field: ${field}`);
    }
    return value;
}
function requireFinancialString(value, field) {
    const result = requireString(value, field);
    const parsed = Number(result);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid Alpaca financial field: ${field}`);
    }
    return result;
}
function requireNonNegativeFinancialString(value, field) {
    const result = requireFinancialString(value, field);
    if (Number(result) < 0) {
        throw new Error(`Invalid Alpaca financial field: ${field}`);
    }
    return result;
}
function requireMarginMultiplier(value, field) {
    const result = requireFinancialString(value, field);
    if (result !== '1' && result !== '2' && result !== '4') {
        throw new Error(`Unsupported Alpaca margin multiplier: ${result}`);
    }
    return result;
}
function requireBoolean(value, field) {
    if (typeof value !== 'boolean') {
        throw new Error(`Invalid Alpaca account field: ${field}`);
    }
    return value;
}
