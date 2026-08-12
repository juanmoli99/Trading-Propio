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
exports.MarketDataTradingStatusService = void 0;
const common_1 = require("@nestjs/common");
const market_data_luld_mapper_1 = require("./market-data-luld.mapper");
const market_data_trading_status_mapper_1 = require("./market-data-trading-status.mapper");
let MarketDataTradingStatusService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MarketDataTradingStatusService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MarketDataTradingStatusService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        socket = null;
        feed = null;
        authenticated = false;
        subscriptions = new Set();
        statuses = new Map();
        previousStatuses = new Map();
        luldStatuses = new Map();
        constructor(configService) {
            this.configService = configService;
        }
        async connect(feed = 'iex') {
            this.validateFeed(feed);
            if (this.socket !== null) {
                throw new Error('Market data trading status stream is already connected');
            }
            const credentials = this.resolveCredentials();
            const socket = new WebSocket(this.buildStreamUrl(feed));
            this.socket = socket;
            this.feed = feed;
            this.authenticated = false;
            socket.addEventListener('message', (event) => {
                this.handleMessage(event.data);
            });
            try {
                await this.authenticate(socket, credentials);
            }
            catch (error) {
                this.disconnect();
                throw error;
            }
        }
        subscribeSymbol(symbol) {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            this.assertConnected();
            if (this.subscriptions.has(normalizedSymbol)) {
                return;
            }
            this.socket?.send(JSON.stringify({
                action: 'subscribe',
                statuses: [normalizedSymbol],
                lulds: [normalizedSymbol],
            }));
            this.subscriptions.add(normalizedSymbol);
        }
        unsubscribeSymbol(symbol) {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            this.assertConnected();
            if (!this.subscriptions.has(normalizedSymbol)) {
                return;
            }
            this.socket?.send(JSON.stringify({
                action: 'unsubscribe',
                statuses: [normalizedSymbol],
                lulds: [normalizedSymbol],
            }));
            this.subscriptions.delete(normalizedSymbol);
        }
        getTradingStatus(symbol) {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            const status = this.statuses.get(normalizedSymbol);
            const previousStatus = this.previousStatuses.get(normalizedSymbol);
            return {
                symbol: normalizedSymbol,
                status: status ? this.cloneStatus(status) : null,
                previousStatus: previousStatus
                    ? this.cloneStatus(previousStatus)
                    : null,
            };
        }
        getLuldStatus(symbol) {
            const normalizedSymbol = this.normalizeSymbol(symbol);
            const luld = this.luldStatuses.get(normalizedSymbol);
            return {
                symbol: normalizedSymbol,
                luld: luld ? this.cloneLuld(luld) : null,
            };
        }
        getSubscribedSymbols() {
            return [...this.subscriptions].sort();
        }
        ingestMessageForVerification(value, feed, receivedAt = new Date()) {
            const status = (0, market_data_trading_status_mapper_1.normalizeMarketDataTradingStatus)(value, feed, receivedAt);
            this.storeStatus(status);
            return this.cloneStatus(status);
        }
        ingestLuldForVerification(value, feed, receivedAt = new Date()) {
            const luld = (0, market_data_luld_mapper_1.normalizeMarketDataLuld)(value, feed, receivedAt);
            this.storeLuld(luld);
            return this.cloneLuld(luld);
        }
        disconnect() {
            const socket = this.socket;
            this.socket = null;
            this.feed = null;
            this.authenticated = false;
            this.subscriptions.clear();
            if (socket !== null &&
                (socket.readyState === WebSocket.OPEN ||
                    socket.readyState === WebSocket.CONNECTING)) {
                socket.close();
            }
        }
        onModuleDestroy() {
            this.disconnect();
        }
        authenticate(socket, credentials) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error('Alpaca market data stream authentication timed out'));
                }, 10_000);
                const cleanup = () => {
                    clearTimeout(timeout);
                    socket.removeEventListener('message', onMessage);
                    socket.removeEventListener('error', onError);
                    socket.removeEventListener('close', onClose);
                };
                const onError = () => {
                    cleanup();
                    reject(new Error('Alpaca market data stream connection failed'));
                };
                const onClose = () => {
                    cleanup();
                    reject(new Error('Alpaca market data stream closed before authentication'));
                };
                const onMessage = (event) => {
                    const messages = this.parseMessages(event.data);
                    for (const message of messages) {
                        if (message.T === 'success' &&
                            message.msg === 'authenticated') {
                            this.authenticated = true;
                            cleanup();
                            resolve();
                            return;
                        }
                        if (message.T === 'error') {
                            cleanup();
                            reject(new Error(`Alpaca market data stream authentication failed: ${typeof message.msg === 'string'
                                ? message.msg
                                : 'unknown error'}`));
                            return;
                        }
                    }
                };
                socket.addEventListener('message', onMessage);
                socket.addEventListener('error', onError);
                socket.addEventListener('close', onClose);
                socket.addEventListener('open', () => {
                    socket.send(JSON.stringify({
                        action: 'auth',
                        key: credentials.apiKey,
                        secret: credentials.apiSecret,
                    }));
                }, { once: true });
            });
        }
        handleMessage(data) {
            if (this.feed === null) {
                return;
            }
            const messages = this.parseMessages(data);
            for (const message of messages) {
                if (message.T === 's') {
                    const status = (0, market_data_trading_status_mapper_1.normalizeMarketDataTradingStatus)(message, this.feed);
                    this.storeStatus(status);
                    continue;
                }
                if (message.T === 'l') {
                    const luld = (0, market_data_luld_mapper_1.normalizeMarketDataLuld)(message, this.feed);
                    this.storeLuld(luld);
                }
            }
        }
        storeStatus(status) {
            const existing = this.statuses.get(status.symbol);
            if (existing !== undefined &&
                status.timestamp.getTime() < existing.timestamp.getTime()) {
                return;
            }
            if (existing !== undefined &&
                status.timestamp.getTime() > existing.timestamp.getTime()) {
                this.previousStatuses.set(status.symbol, this.cloneStatus(existing));
            }
            this.statuses.set(status.symbol, this.cloneStatus(status));
        }
        storeLuld(luld) {
            const existing = this.luldStatuses.get(luld.symbol);
            if (existing !== undefined &&
                luld.timestamp.getTime() < existing.timestamp.getTime()) {
                return;
            }
            this.luldStatuses.set(luld.symbol, this.cloneLuld(luld));
        }
        parseMessages(data) {
            let parsed;
            try {
                if (typeof data === 'string') {
                    parsed = JSON.parse(data);
                }
                else if (data instanceof ArrayBuffer) {
                    parsed = JSON.parse(Buffer.from(data).toString('utf8'));
                }
                else {
                    return [];
                }
            }
            catch {
                return [];
            }
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.filter((item) => typeof item === 'object' && item !== null);
        }
        assertConnected() {
            if (this.socket === null ||
                this.socket.readyState !== WebSocket.OPEN ||
                !this.authenticated) {
                throw new Error('Market data trading status stream is not authenticated');
            }
        }
        buildStreamUrl(feed) {
            return `wss://stream.data.alpaca.markets/v2/${feed}`;
        }
        resolveCredentials() {
            const tradingMode = this.configService.get('app.tradingMode') ?? 'PAPER';
            const prefix = tradingMode === 'LIVE' ? 'alpaca.live' : 'alpaca.paper';
            const apiKey = this.configService.get(`${prefix}.apiKey`);
            const apiSecret = this.configService.get(`${prefix}.apiSecret`);
            if (!apiKey || !apiSecret) {
                throw new Error(`Alpaca market data credentials are missing for ${tradingMode}`);
            }
            return {
                apiKey,
                apiSecret,
            };
        }
        normalizeSymbol(symbol) {
            const normalized = symbol.trim().toUpperCase();
            if (!normalized ||
                normalized.length > 32 ||
                /\s/.test(normalized)) {
                throw new Error('Invalid market data trading status symbol');
            }
            return normalized;
        }
        validateFeed(feed) {
            if (feed !== 'iex' && feed !== 'sip') {
                throw new Error('Invalid market data trading status feed');
            }
        }
        cloneStatus(status) {
            return {
                ...status,
                timestamp: new Date(status.timestamp),
                receivedAt: new Date(status.receivedAt),
            };
        }
        cloneLuld(luld) {
            return {
                ...luld,
                timestamp: new Date(luld.timestamp),
                receivedAt: new Date(luld.receivedAt),
            };
        }
    };
    return MarketDataTradingStatusService = _classThis;
})();
exports.MarketDataTradingStatusService = MarketDataTradingStatusService;
