import { effectiveValues, type TransactionLifecycle } from "./transaction-lifecycle.ts";
import { calculateReportingMetrics, type ReportingCurrency } from "./reporting-currency.ts";
import { confirmRecord, type ScenarioState } from "./fictional-scenario.ts";

export function attentionReasons(record: TransactionLifecycle, records: TransactionLifecycle[]): string[] {
  const reasons: string[] = [];
  if (records.some(item => item.relationships.some(rel => rel.kind === "possible_duplicate_of" && (item.id === record.id || rel.targetId === record.id)))) reasons.push("Possible duplicate");
  if (record.evidenceConflict) reasons.push("Later source evidence conflicts");
  if (record.interpretation.eventType === "unknown" && !record.userOverrides.eventType) reasons.push("Type will use generic expense");
  if (!record.interpretation.currency && !record.userOverrides.currency) reasons.push("Currency will use reporting currency");
  if (["transfer", "withdrawal"].includes(effectiveValues(record).eventType)) reasons.push("Neutral money movement");
  return reasons;
}

export function visibleActivity(records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.filter(record => record.deletionState === "active" && !record.relationships.some(rel => rel.kind === "duplicate_of"));
}

export function linkedEvidence(record: TransactionLifecycle, records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.filter(item => item.id === record.id || item.relationships.some(rel => rel.kind === "duplicate_of" && rel.targetId === record.id));
}

export function reviewQueue(state: ScenarioState, currency: ReportingCurrency, week: string) {
  const all = calculateReportingMetrics(state.records, currency);
  const weekly = calculateReportingMetrics(state.records, currency, week);
  const pending = new Set(all.effects.filter(effect => effect.pendingAmountMinor > 0).map(effect => effect.recordId));
  const monetary = state.records.filter(record => pending.has(record.id));
  const nonMonetary = state.records.filter(record => record.confirmationState === "needs_confirmation" && !pending.has(record.id) && record.disposition === "active" && record.deletionState === "active" && !record.relationships.some(rel => rel.kind === "duplicate_of") && attentionReasons(record, state.records).length > 0);
  const ready = monetary.filter(record => attentionReasons(record, state.records).length === 0);
  const needsAttention = [...monetary.filter(record => attentionReasons(record, state.records).length > 0), ...nonMonetary];
  const readyMetrics = calculateReportingMetrics(ready, currency);
  const readyWeek = calculateReportingMetrics(ready, currency, week);
  return {
    ready, needsAttention,
    readyAmountMinor: readyMetrics.pendingAmountMinor,
    readyWeekAmountMinor: readyWeek.pendingAmountMinor,
    readyElsewhereAmountMinor: readyMetrics.pendingAmountMinor - readyWeek.pendingAmountMinor,
    week: { count: weekly.pendingCount, amountMinor: weekly.pendingAmountMinor },
    elsewhere: { count: all.pendingCount - weekly.pendingCount, amountMinor: all.pendingAmountMinor - weekly.pendingAmountMinor },
    total: { count: all.pendingCount, amountMinor: all.pendingAmountMinor },
  };
}

export function confirmReady(state: ScenarioState, currency: ReportingCurrency, week: string, selectedIds?: string[]): ScenarioState {
  const ready = reviewQueue(state, currency, week).ready;
  const ids = selectedIds ? new Set(selectedIds) : undefined;
  return ready.filter(record => !ids || ids.has(record.id)).reduce((next, record) => confirmRecord(next, record.id), state);
}
