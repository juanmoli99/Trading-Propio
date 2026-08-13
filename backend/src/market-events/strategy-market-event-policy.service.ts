import { Injectable } from '@nestjs/common';
import {
  MARKET_EVENT_POLICY_ACTIONS,
  type MarketEventPolicyAction,
  type StrategyMarketEventPolicyInput,
  type StrategyMarketEventPolicyResult,
  type StrategyMarketEventPolicyRule,
} from './strategy-market-event-policy.types';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_POLICY_WINDOW_DAYS = 730;

@Injectable()
export class StrategyMarketEventPolicyService {
  evaluate(
    input: StrategyMarketEventPolicyInput,
  ): StrategyMarketEventPolicyResult {
    const strategyId = this.normalizeStrategyId(input.policy.strategyId);

    const asOf = this.normalizeAsOf(input.asOf);
    const eventDate = this.normalizeEventDate(input.event.eventDate);

    const calendarDaysToEvent = this.calculateCalendarDays(asOf, eventDate);

    const rules = input.policy.rules.map((rule) => this.normalizeRule(rule));

    this.assertUniqueRuleIds(rules);

    const matchingRule = rules.find((rule) =>
      this.ruleMatches(rule, input.event, calendarDaysToEvent),
    );

    if (matchingRule === undefined) {
      return {
        strategyId,
        symbol: input.event.symbol,
        eventKind: input.event.kind,
        eventDate: new Date(eventDate),
        asOf: new Date(asOf),
        calendarDaysToEvent,
        matchedRuleId: null,
        action: 'ALLOW',
        positionSizeMultiplier: 1,
        entryAllowed: true,
        overnightAllowed: true,
        reason: 'No configured strategy market-event policy rule matched',
      };
    }

    return this.applyRule(
      strategyId,
      matchingRule,
      input.event.symbol,
      input.event.kind,
      eventDate,
      asOf,
      calendarDaysToEvent,
    );
  }

  private applyRule(
    strategyId: string,
    rule: StrategyMarketEventPolicyRule,
    symbol: string,
    eventKind: StrategyMarketEventPolicyResult['eventKind'],
    eventDate: Date,
    asOf: Date,
    calendarDaysToEvent: number,
  ): StrategyMarketEventPolicyResult {
    switch (rule.action) {
      case 'ALLOW':
        return this.createResult(
          strategyId,
          symbol,
          eventKind,
          eventDate,
          asOf,
          calendarDaysToEvent,
          rule.id,
          'ALLOW',
          1,
          true,
          true,
        );

      case 'BLOCK_ENTRY':
        return this.createResult(
          strategyId,
          symbol,
          eventKind,
          eventDate,
          asOf,
          calendarDaysToEvent,
          rule.id,
          'BLOCK_ENTRY',
          1,
          false,
          true,
        );

      case 'REDUCE_POSITION_SIZE':
        return this.createResult(
          strategyId,
          symbol,
          eventKind,
          eventDate,
          asOf,
          calendarDaysToEvent,
          rule.id,
          'REDUCE_POSITION_SIZE',
          this.requireReductionMultiplier(rule),
          true,
          true,
        );

      case 'PROHIBIT_OVERNIGHT':
        return this.createResult(
          strategyId,
          symbol,
          eventKind,
          eventDate,
          asOf,
          calendarDaysToEvent,
          rule.id,
          'PROHIBIT_OVERNIGHT',
          1,
          true,
          false,
        );
    }
  }

  private createResult(
    strategyId: string,
    symbol: string,
    eventKind: StrategyMarketEventPolicyResult['eventKind'],
    eventDate: Date,
    asOf: Date,
    calendarDaysToEvent: number,
    matchedRuleId: string,
    action: MarketEventPolicyAction,
    positionSizeMultiplier: number,
    entryAllowed: boolean,
    overnightAllowed: boolean,
  ): StrategyMarketEventPolicyResult {
    return {
      strategyId,
      symbol,
      eventKind,
      eventDate: new Date(eventDate),
      asOf: new Date(asOf),
      calendarDaysToEvent,
      matchedRuleId,
      action,
      positionSizeMultiplier,
      entryAllowed,
      overnightAllowed,
      reason: `Strategy market-event policy rule ${matchedRuleId} applied action ${action}`,
    };
  }

  private ruleMatches(
    rule: StrategyMarketEventPolicyRule,
    event: StrategyMarketEventPolicyInput['event'],
    calendarDaysToEvent: number,
  ): boolean {
    if (rule.eventKind !== event.kind) {
      return false;
    }

    if (
      event.kind === 'CORPORATE_ACTION' &&
      rule.corporateActionTypes !== undefined &&
      !rule.corporateActionTypes.includes(event.corporateActionType)
    ) {
      return false;
    }

    return (
      calendarDaysToEvent <= rule.beforeDays &&
      calendarDaysToEvent >= -rule.afterDays
    );
  }

  private normalizeRule(
    rule: StrategyMarketEventPolicyRule,
  ): StrategyMarketEventPolicyRule {
    const id = rule.id.trim();

    if (!id || id.length > 128) {
      throw new Error('Invalid strategy market-event policy rule ID');
    }

    if (!MARKET_EVENT_POLICY_ACTIONS.includes(rule.action)) {
      throw new Error('Invalid strategy market-event policy action');
    }

    this.validateWindow(rule.beforeDays, 'beforeDays');

    this.validateWindow(rule.afterDays, 'afterDays');

    if (rule.action === 'REDUCE_POSITION_SIZE') {
      this.requireReductionMultiplier(rule);
    } else if (rule.positionSizeMultiplier !== undefined) {
      throw new Error(
        'positionSizeMultiplier is only valid for REDUCE_POSITION_SIZE',
      );
    }

    const corporateActionTypes =
      rule.corporateActionTypes === undefined
        ? undefined
        : [...rule.corporateActionTypes];

    if (
      rule.eventKind !== 'CORPORATE_ACTION' &&
      corporateActionTypes !== undefined
    ) {
      throw new Error(
        'corporateActionTypes is only valid for CORPORATE_ACTION rules',
      );
    }

    if (
      corporateActionTypes !== undefined &&
      corporateActionTypes.length === 0
    ) {
      throw new Error('corporateActionTypes must not be empty');
    }

    if (
      corporateActionTypes !== undefined &&
      new Set(corporateActionTypes).size !== corporateActionTypes.length
    ) {
      throw new Error('Duplicate corporateActionTypes are not allowed');
    }

    return {
      ...rule,
      id,
      corporateActionTypes,
    };
  }

  private requireReductionMultiplier(
    rule: StrategyMarketEventPolicyRule,
  ): number {
    const multiplier = rule.positionSizeMultiplier;

    if (
      multiplier === undefined ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0 ||
      multiplier >= 1
    ) {
      throw new Error(
        'REDUCE_POSITION_SIZE requires positionSizeMultiplier greater than 0 and less than 1',
      );
    }

    return multiplier;
  }

  private validateWindow(value: number, field: string): void {
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_POLICY_WINDOW_DAYS
    ) {
      throw new Error(
        `Strategy market-event policy ${field} must be between 0 and ${MAX_POLICY_WINDOW_DAYS}`,
      );
    }
  }

  private assertUniqueRuleIds(
    rules: readonly StrategyMarketEventPolicyRule[],
  ): void {
    const ids = rules.map((rule) => rule.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error('Duplicate strategy market-event policy rule ID');
    }
  }

  private normalizeStrategyId(value: string): string {
    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
      throw new Error('Invalid strategy market-event policy strategy ID');
    }

    return normalized;
  }

  private normalizeAsOf(value: Date | undefined): Date {
    const resolved =
      value === undefined ? new Date() : new Date(value.getTime());

    if (!Number.isFinite(resolved.getTime())) {
      throw new Error('Invalid strategy market-event policy asOf date');
    }

    return resolved;
  }

  private normalizeEventDate(value: Date): Date {
    const resolved = new Date(value.getTime());

    if (!Number.isFinite(resolved.getTime())) {
      throw new Error('Invalid strategy market-event policy event date');
    }

    return resolved;
  }

  private calculateCalendarDays(asOf: Date, eventDate: Date): number {
    const asOfStart = Date.UTC(
      asOf.getUTCFullYear(),
      asOf.getUTCMonth(),
      asOf.getUTCDate(),
    );

    const eventStart = Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
    );

    const result = (eventStart - asOfStart) / MILLISECONDS_PER_DAY;

    if (!Number.isInteger(result)) {
      throw new Error(
        'Strategy market-event policy calendar calculation is inconsistent',
      );
    }

    return result;
  }
}
