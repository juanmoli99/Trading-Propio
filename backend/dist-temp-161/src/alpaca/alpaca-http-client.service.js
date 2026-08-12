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
exports.AlpacaHttpClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const alpaca_network_error_1 = require("./alpaca-network.error");
const alpaca_rate_limit_error_1 = require("./alpaca-rate-limit.error");
let AlpacaHttpClient = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AlpacaHttpClient = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AlpacaHttpClient = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        configService;
        rateLimitService;
        recoveryService;
        client;
        tradingMode;
        baseUrl;
        timeoutMs;
        constructor(configService, rateLimitService, recoveryService) {
            this.configService = configService;
            this.rateLimitService = rateLimitService;
            this.recoveryService = recoveryService;
        }
        onModuleInit() {
            this.tradingMode =
                this.configService.get('app.tradingMode') ?? 'PAPER';
            this.baseUrl = this.resolveBaseUrl(this.tradingMode);
            this.timeoutMs = this.resolveTimeoutMs();
            const credentials = this.resolveCredentials(this.tradingMode);
            this.client = axios_1.default.create({
                baseURL: this.baseUrl,
                timeout: this.timeoutMs,
                headers: {
                    'APCA-API-KEY-ID': credentials.apiKey,
                    'APCA-API-SECRET-KEY': credentials.apiSecret,
                },
            });
        }
        getTradingMode() {
            return this.tradingMode;
        }
        getBaseUrl() {
            return this.baseUrl;
        }
        getTimeoutMs() {
            return this.timeoutMs;
        }
        async request(request) {
            const config = {
                method: request.method,
                url: this.normalizePath(request.path),
                params: request.query,
                data: request.body,
            };
            return this.recoveryService.execute(request, () => this.executeRequest(config));
        }
        async executeRequest(config) {
            try {
                const response = await this.client.request(config);
                const headers = this.normalizeHeaders(response.headers);
                this.rateLimitService.updateFromHeaders(headers);
                return {
                    status: response.status,
                    data: response.data,
                    headers,
                };
            }
            catch (error) {
                throw this.normalizeRequestError(error);
            }
        }
        normalizeRequestError(error) {
            if (!axios_1.default.isAxiosError(error)) {
                return error;
            }
            if (error.response) {
                const headers = this.normalizeHeaders(error.response.headers);
                this.rateLimitService.updateFromHeaders(headers);
                if (error.response.status === 429) {
                    return new alpaca_rate_limit_error_1.AlpacaRateLimitError(this.rateLimitService.getSnapshot().resetAt, {
                        cause: error,
                    });
                }
                return error;
            }
            return new alpaca_network_error_1.AlpacaNetworkError(this.classifyNetworkError(error), this.networkErrorMessage(error), {
                cause: error,
                retryable: true,
            });
        }
        classifyNetworkError(error) {
            switch (error.code) {
                case 'ECONNABORTED':
                case 'ETIMEDOUT':
                    return 'TIMEOUT';
                case 'ECONNREFUSED':
                    return 'CONNECTION_REFUSED';
                case 'ECONNRESET':
                    return 'CONNECTION_RESET';
                case 'ENOTFOUND':
                case 'EAI_AGAIN':
                    return 'DNS_FAILURE';
                case 'ENETUNREACH':
                case 'EHOSTUNREACH':
                    return 'NETWORK_UNREACHABLE';
                default:
                    return 'NETWORK_ERROR';
            }
        }
        networkErrorMessage(error) {
            const code = this.classifyNetworkError(error);
            switch (code) {
                case 'TIMEOUT':
                    return 'Alpaca request timed out';
                case 'CONNECTION_REFUSED':
                    return 'Alpaca connection was refused';
                case 'CONNECTION_RESET':
                    return 'Alpaca connection was reset';
                case 'DNS_FAILURE':
                    return 'Alpaca hostname could not be resolved';
                case 'NETWORK_UNREACHABLE':
                    return 'Alpaca network is unreachable';
                default:
                    return 'Alpaca network request failed';
            }
        }
        resolveTimeoutMs() {
            const timeoutMs = this.configService.get('operational.defaultHttpTimeoutMs');
            if (timeoutMs === undefined ||
                !Number.isInteger(timeoutMs) ||
                timeoutMs < 100 ||
                timeoutMs > 120000) {
                throw new Error('Invalid Alpaca HTTP timeout configuration');
            }
            return timeoutMs;
        }
        resolveBaseUrl(tradingMode) {
            const configKey = tradingMode === 'LIVE' ? 'alpaca.live.baseUrl' : 'alpaca.paper.baseUrl';
            const baseUrl = this.configService.get(configKey);
            if (!baseUrl) {
                throw new Error(`Alpaca base URL is missing for ${tradingMode}`);
            }
            let parsedUrl;
            try {
                parsedUrl = new URL(baseUrl);
            }
            catch {
                throw new Error(`Invalid Alpaca base URL for ${tradingMode}`);
            }
            if (parsedUrl.protocol !== 'https:') {
                throw new Error(`Alpaca base URL must use HTTPS for ${tradingMode}`);
            }
            return parsedUrl.toString().replace(/\/$/, '');
        }
        resolveCredentials(tradingMode) {
            const prefix = tradingMode === 'LIVE' ? 'alpaca.live' : 'alpaca.paper';
            const apiKey = this.configService.get(`${prefix}.apiKey`);
            const apiSecret = this.configService.get(`${prefix}.apiSecret`);
            if (!apiKey || !apiSecret) {
                throw new Error(`Alpaca credentials are missing for ${tradingMode}`);
            }
            return {
                apiKey,
                apiSecret,
            };
        }
        normalizePath(path) {
            const trimmed = path.trim();
            if (!trimmed) {
                throw new Error('Alpaca request path is required');
            }
            if (trimmed.startsWith('http://') ||
                trimmed.startsWith('https://') ||
                trimmed.startsWith('//')) {
                throw new Error('Alpaca request path must be relative');
            }
            return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        }
        normalizeHeaders(headers) {
            if (typeof headers !== 'object' || headers === null) {
                return {};
            }
            const normalized = {};
            for (const [key, value] of Object.entries(headers)) {
                if (typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean') {
                    normalized[key] = String(value);
                }
            }
            return normalized;
        }
    };
    return AlpacaHttpClient = _classThis;
})();
exports.AlpacaHttpClient = AlpacaHttpClient;
