export type RegulatoryFramework = 'INTRADAY_MARGIN';

export type RegulatoryMismatchPolicy = 'BLOCK';

export interface LegacyPdtRules {
  readonly enabled: boolean;
  readonly brokerStatusAvailable: boolean;
  readonly roundTripTrackingRequired: boolean;
  readonly rollingWindowBusinessDays: number | null;
  readonly maximumRoundTrips: number | null;
}

export interface IntradayMarginRules {
  readonly enabled: boolean;
  readonly brokerBuyingPowerAuthoritative: boolean;
  readonly brokerRestrictionsAuthoritative: boolean;
}

export interface RegulatoryRuleSource {
  readonly provider: 'ALPACA';
  readonly reference: string;
  readonly apiRemovalDate: string;
}

export interface RegulatoryRuleSet {
  readonly schemaVersion: 1;
  readonly jurisdiction: 'US';
  readonly broker: 'ALPACA';
  readonly framework: RegulatoryFramework;
  readonly effectiveFrom: string;
  readonly mismatchPolicy: RegulatoryMismatchPolicy;
  readonly legacyPdt: LegacyPdtRules;
  readonly intradayMargin: IntradayMarginRules;
  readonly source: RegulatoryRuleSource;
}

export interface VersionedRegulatoryRuleSet {
  readonly metadataVersion: number;
  readonly rules: RegulatoryRuleSet;
}
