import type { RuleSet } from "../types/rules.js";

const ruleSetRegistry = new Map<string, RuleSet>();

export function registerRuleSet(ruleSet: RuleSet): void {
  ruleSetRegistry.set(ruleSet.id, ruleSet);
}

export function getRuleSet(id: string): RuleSet | undefined {
  return ruleSetRegistry.get(id);
}

export function getAllRuleSets(): RuleSet[] {
  return Array.from(ruleSetRegistry.values());
}

export function getRuleSetIds(): string[] {
  return Array.from(ruleSetRegistry.keys());
}
