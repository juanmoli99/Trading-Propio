import { z } from 'zod';
import type { RegulatoryRuleSet } from './regulatory-rules.types';

const dateSchema = z.iso.date();

export const regulatoryRuleSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    jurisdiction: z.literal('US'),
    broker: z.literal('ALPACA'),
    framework: z.literal('INTRADAY_MARGIN'),
    effectiveFrom: dateSchema,
    mismatchPolicy: z.literal('BLOCK'),

    legacyPdt: z.object({
      enabled: z.boolean(),
      brokerStatusAvailable: z.boolean(),
      roundTripTrackingRequired: z.boolean(),
      rollingWindowBusinessDays: z.number().int().positive().nullable(),
      maximumRoundTrips: z.number().int().nonnegative().nullable(),
    }),

    intradayMargin: z.object({
      enabled: z.boolean(),
      brokerBuyingPowerAuthoritative: z.boolean(),
      brokerRestrictionsAuthoritative: z.boolean(),
    }),

    source: z.object({
      provider: z.literal('ALPACA'),
      reference: z.string().trim().min(1).max(200),
      apiRemovalDate: dateSchema,
    }),
  })
  .strict();

export const CURRENT_REGULATORY_RULES: RegulatoryRuleSet =
  regulatoryRuleSetSchema.parse({
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
