"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_REGULATORY_RULES = exports.regulatoryRuleSetSchema = void 0;
const zod_1 = require("zod");
const dateSchema = zod_1.z.iso.date();
exports.regulatoryRuleSetSchema = zod_1.z
    .object({
    schemaVersion: zod_1.z.literal(1),
    jurisdiction: zod_1.z.literal('US'),
    broker: zod_1.z.literal('ALPACA'),
    framework: zod_1.z.literal('INTRADAY_MARGIN'),
    effectiveFrom: dateSchema,
    mismatchPolicy: zod_1.z.literal('BLOCK'),
    legacyPdt: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        brokerStatusAvailable: zod_1.z.boolean(),
        roundTripTrackingRequired: zod_1.z.boolean(),
        rollingWindowBusinessDays: zod_1.z.number().int().positive().nullable(),
        maximumRoundTrips: zod_1.z.number().int().nonnegative().nullable(),
    }),
    intradayMargin: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        brokerBuyingPowerAuthoritative: zod_1.z.boolean(),
        brokerRestrictionsAuthoritative: zod_1.z.boolean(),
    }),
    source: zod_1.z.object({
        provider: zod_1.z.literal('ALPACA'),
        reference: zod_1.z.string().trim().min(1).max(200),
        apiRemovalDate: dateSchema,
    }),
})
    .strict();
exports.CURRENT_REGULATORY_RULES = exports.regulatoryRuleSetSchema.parse({
    schemaVersion: 1,
    jurisdiction: 'US',
    broker: 'ALPACA',
    framework: 'INTRADAY_MARGIN',
    effectiveFrom: '2026-07-06',
    mismatchPolicy: 'BLOCK',
    legacyPdt: {
        enabled: false,
        brokerStatusAvailable: false,
        roundTripTrackingRequired: false,
        rollingWindowBusinessDays: null,
        maximumRoundTrips: null,
    },
    intradayMargin: {
        enabled: true,
        brokerBuyingPowerAuthoritative: true,
        brokerRestrictionsAuthoritative: true,
    },
    source: {
        provider: 'ALPACA',
        reference: '2026-06-03-pdt-651df23',
        apiRemovalDate: '2026-07-06',
    },
});
