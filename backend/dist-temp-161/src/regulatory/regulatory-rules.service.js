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
exports.RegulatoryRulesService = void 0;
const common_1 = require("@nestjs/common");
const regulatory_rules_schema_1 = require("./regulatory-rules.schema");
const REGULATORY_RULES_KEY = 'regulatory.rules.us.alpaca';
let RegulatoryRulesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RegulatoryRulesService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RegulatoryRulesService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        async onModuleInit() {
            await this.initializeIfMissing();
        }
        async getCurrent() {
            const metadata = await this.prisma.systemMetadata.findUnique({
                where: {
                    key: REGULATORY_RULES_KEY,
                },
            });
            if (!metadata || metadata.status !== 'ACTIVE') {
                throw new Error('Active regulatory rules are not available');
            }
            return {
                metadataVersion: metadata.version,
                rules: this.parseRules(metadata.value),
            };
        }
        async updateRules(rules, expectedVersion) {
            if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
                throw new Error('Invalid expected regulatory rules version');
            }
            const validatedRules = regulatory_rules_schema_1.regulatoryRuleSetSchema.parse(rules);
            const value = JSON.stringify(validatedRules);
            return this.prisma.$transaction(async (transaction) => {
                const current = await transaction.systemMetadata.findUnique({
                    where: {
                        key: REGULATORY_RULES_KEY,
                    },
                });
                if (!current || current.status !== 'ACTIVE') {
                    throw new Error('Active regulatory rules are not available');
                }
                if (current.version !== expectedVersion) {
                    throw new Error('Regulatory rules version conflict');
                }
                const updated = await transaction.systemMetadata.updateMany({
                    where: {
                        id: current.id,
                        version: expectedVersion,
                        status: 'ACTIVE',
                    },
                    data: {
                        value,
                        version: {
                            increment: 1,
                        },
                    },
                });
                if (updated.count !== 1) {
                    throw new Error('Regulatory rules version conflict');
                }
                await transaction.systemMetadataRevision.create({
                    data: {
                        systemMetadataId: current.id,
                        value,
                    },
                });
                return {
                    metadataVersion: expectedVersion + 1,
                    rules: validatedRules,
                };
            });
        }
        async initializeIfMissing() {
            const existing = await this.prisma.systemMetadata.findUnique({
                where: {
                    key: REGULATORY_RULES_KEY,
                },
            });
            if (existing) {
                this.parseRules(existing.value);
                return;
            }
            const value = JSON.stringify(regulatory_rules_schema_1.CURRENT_REGULATORY_RULES);
            await this.prisma.systemMetadata.create({
                data: {
                    key: REGULATORY_RULES_KEY,
                    value,
                    status: 'ACTIVE',
                    revisions: {
                        create: {
                            value,
                        },
                    },
                },
            });
        }
        parseRules(value) {
            let parsed;
            try {
                parsed = JSON.parse(value);
            }
            catch {
                throw new Error('Stored regulatory rules contain invalid JSON');
            }
            return regulatory_rules_schema_1.regulatoryRuleSetSchema.parse(parsed);
        }
    };
    return RegulatoryRulesService = _classThis;
})();
exports.RegulatoryRulesService = RegulatoryRulesService;
