import { canConfirm, effectiveValues, groupingDate, sourceIdentityConflict, type TransactionLifecycle } from "./transaction-lifecycle.ts";
import { calculateReportingMetrics, reportingEventEffect, type ReportingCurrency } from "./reporting-currency.ts";
import { confirmRecord, type ScenarioState } from "./fictional-scenario.ts";

export function attentionReasons(record: TransactionLifecycle, records: TransactionLifecycle[]): string[] {
  const reasons: string[] = [];
  if (records.some(item => item.relationships.some(rel => rel.kind === "possible_duplicate_of" && (item.id === record.id || rel.targetId === record.id)))) reasons.push("Possible duplicate");
  if (record.evidenceConflict) reasons.push("Later source evidence conflicts");
  if (sourceIdentityConflict(record) && !record.userOverrides.walletLabel) reasons.push("Source account or card conflicts: choose a wallet");
  if (effectiveValues(record).eventType === "unknown") reasons.push("Type unclassified: choose Expense, Income, or Transfer between accounts");
  if (!effectiveValues(record).currency) reasons.push("Currency missing: choose a currency");
  if (effectiveValues(record).currencyBasis === "assumed_default") reasons.push(`Currency assumed: ${effectiveValues(record).currency} default; review or change currency`);
  if (effectiveValues(record).amountMinor === undefined) reasons.push("Amount missing");
  if (["transfer", "withdrawal"].includes(effectiveValues(record).eventType)) reasons.push("Neutral money movement");
  return reasons;
}

/** Neutral activity still needs a person's decision, but its type alone must not block that decision. */
export function neutralReviewReady(record: TransactionLifecycle, records: TransactionLifecycle[]): boolean {
  return record.confirmationState === "needs_confirmation" &&
    ["transfer", "withdrawal"].includes(effectiveValues(record).eventType) &&
    canConfirm(record) &&
    attentionReasons(record, records).every(reason => reason === "Neutral money movement");
}

export function newestFirst(records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.map((record, index) => ({ record, index })).sort((a, b) => {
    const time = (record: TransactionLifecycle) => { const value = groupingDate(record).value, instant = value ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value).getTime() : NaN; return Number.isFinite(instant) ? instant : -Infinity; };
    return time(b.record) - time(a.record) || a.index - b.index;
  }).map(item => item.record);
}

export function visibleActivity(records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.filter(record => record.deletionState === "active" && !record.relationships.some(rel => rel.kind === "duplicate_of"));
}

export function linkedEvidence(record: TransactionLifecycle, records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.filter(item => item.id === record.id || item.relationships.some(rel => rel.kind === "duplicate_of" && rel.targetId === record.id));
}

export function reviewQueue(state: ScenarioState, currency: ReportingCurrency, week: string, scopedIds?: ReadonlySet<string>) {
  const scoped = scopedIds ? state.records.filter(record => scopedIds.has(record.id)) : state.records;
  const pending = newestFirst(visibleActivity(scoped).filter(record => record.confirmationState === "needs_confirmation" && record.disposition === "active"));
  const ready = pending.filter(record => attentionReasons(record, state.records).length === 0 && reportingEventEffect(record, currency).included);
  const needsAttention = pending.filter(record => !ready.includes(record));
  const all = calculateReportingMetrics(scoped, currency);
  const weekly = calculateReportingMetrics(scoped, currency, week);
  const summarize = (records: TransactionLifecycle[]) => {
    const effects = records.map(record => reportingEventEffect(record, currency));
    return { count: records.length, inflowMinor: effects.reduce((sum, effect) => sum + effect.inflowMinor, 0), outflowMinor: effects.reduce((sum, effect) => sum + effect.outflowMinor, 0), unclassifiedMinor: effects.reduce((sum, effect) => sum + effect.unclassifiedAmountMinor, 0), zeroCount: effects.filter(effect => !effect.inflowMinor && !effect.outflowMinor && !effect.unclassifiedAmountMinor).length };
  };
  const weekIds = new Set(weekly.effects.filter(effect => effect.reason !== "outside_week").map(effect => effect.recordId));
  const weekPending = pending.filter(record => weekIds.has(record.id));
  const elsewherePending = pending.filter(record => !weekIds.has(record.id));
  const readyMetrics = calculateReportingMetrics(ready, currency);
  const readyWeek = calculateReportingMetrics(ready, currency, week);
  return {
    ready, needsAttention,
    readyAmountMinor: readyMetrics.pendingAmountMinor,
    readyWeekAmountMinor: readyWeek.pendingAmountMinor,
    readyElsewhereAmountMinor: readyMetrics.pendingAmountMinor - readyWeek.pendingAmountMinor,
    week: summarize(weekPending), elsewhere: summarize(elsewherePending), total: summarize(pending),
    all, weekly,
  };
}

export function confirmReady(state: ScenarioState, currency: ReportingCurrency, week: string, selectedIds?: string[]): ScenarioState {
  const ready = reviewQueue(state, currency, week).ready;
  const ids = selectedIds ? new Set(selectedIds) : undefined;
  return ready.filter(record => !ids || ids.has(record.id)).reduce((next, record) => confirmRecord(next, record.id), state);
}
