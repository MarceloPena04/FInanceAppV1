import fixtures from "../fixtures/data/capture-fixtures.json";
import type { CanonicalCapture } from "../domain/canonical-capture";
import { EMPTY_SCENARIO, processCapture, type ScenarioState } from "../domain/fictional-scenario";
import { effectiveValues, groupingDate, type TransactionLifecycle } from "../domain/transaction-lifecycle";
import { reportingEventEffect, SUPPORTED_REPORTING_CURRENCIES, type ReportingCurrency } from "../domain/reporting-currency";
import { migrateWalletEvidence } from "../domain/wallet-source";
import { createTransactionParser } from "../parser/transaction-parser";

export const STORAGE_KEY = "finance-fictional-scenario-v3";
export const fixtureRecords = fixtures.records as Array<{ id: string; capture: CanonicalCapture }>;
export const focusedIds = ["missing-merchant", "payment-without-currency", "exact-cross-source-email", "exact-cross-source-push", "sparse-cross-source-email", "sparse-cross-source-push", "duplicate-source-original", "duplicate-source-replay", "referenced-pending-usd", "referenced-finalized-usd", "unlinked-pending-usd", "unlinked-finalized-usd", "refund-eur", "transfer-eur", "missing-amount", "unsupported-bank-service-notice"];
export const labels: Record<string, string> = { purchase: "Purchase", income: "Income", refund: "Refund", reversal: "Reversal", transfer: "Transfer", withdrawal: "Withdrawal", unknown: "Type not supplied", generic_expense: "Expense", source_event_date: "Date from transaction text", source_message_date: "Date from notification", first_seen: "First processed", user_corrected_date: "Date corrected by you" };

export function sourceProviderLabel(provider?: string, sourceType?: string) {
  if (provider === "fictional-ledger-app") return "Ledger app";
  if (provider === "fictional-ledger-mail") return "Ledger email";
  if (provider) return provider;
  const sourceLabels: Record<string, string> = { email: "Email", push_notification: "Push notification", sms: "SMS", fixture: "Notification", other: "Notice" };
  return sourceLabels[sourceType ?? ""] ?? "Notice";
}

export function replayFixtures(state: ScenarioState, all = false): ScenarioState {
  const items = all ? fixtureRecords : focusedIds.flatMap(id => fixtureRecords.filter(item => item.id === id));
  return items.reduce((current, item) => processCapture(current, item.id, item.capture), state);
}

export function seededScenario(): ScenarioState {
  return replayFixtures({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" });
}

/** Reject damaged local snapshots before using them in the demo UI. */
function isScenario(value: unknown): value is ScenarioState {
  if (!value || typeof value !== "object") return false;
  const state = value as ScenarioState;
  return state.version === 1 && Array.isArray(state.records) && Array.isArray(state.traces)
    && Array.isArray(state.deletedSourceIdentities) && Array.isArray(state.sourceCurrencyRules)
    && state.records.every(record => record && typeof record.id === "string"
      && record.interpretation && record.userOverrides && Array.isArray(record.relationships)
      && Array.isArray(record.sourceCandidates) && Array.isArray(record.sourceProvenance)
      && record.sourceCandidates.every(candidate => candidate?.sourceFacts && Array.isArray(candidate.sourceFacts.evidence)));
}

export function loadScenario(): { state: ScenarioState; notice?: string } {
  let saved: string | null;
  try { saved = localStorage.getItem(STORAGE_KEY); }
  catch { return { state: seededScenario(), notice: "Saving is unavailable. Changes will last for this session." }; }
  try {
    if (!saved) return { state: seededScenario() };
    const parsed: unknown = JSON.parse(saved);
    if (!isScenario(parsed)) return { state: seededScenario(), notice: "The saved workspace could not be read. The original notices have been restored." };
    const parser = createTransactionParser();
    const migrated = parsed.records.map(original => {
      let record = original;
      // Migrate the earlier cafe reading without resetting unrelated decisions.
      const cafe = record.sourceCandidates.find(item => item.captureId === "capture-028");
      if (cafe && record.interpretation.eventType === "unknown") {
        const capture = fixtureRecords.find(item => item.id === "payment-without-currency")?.capture;
        const fresh = capture && parser.parse(capture);
        if (fresh?.sourceFacts.kind === "purchase") record = { ...record,
          sourceCandidates: record.sourceCandidates.map(item => item.captureId === cafe.captureId ? { ...item, sourceFacts: fresh.sourceFacts } : item),
          interpretation: { ...record.interpretation, eventType: "purchase", merchantText: fresh.sourceFacts.merchantText ?? record.interpretation.merchantText },
        };
      }
      if (!record.interpretation.currency && !record.currencyAssumption && parsed.defaultCurrency) {
        record = { ...record, currencyAssumption: { currency: parsed.defaultCurrency, basis: "chosen_app_default" } };
      }
      if (record.interpretation.eventType === "unknown" && !record.userOverrides.eventType) {
        record = { ...record, confirmationState: "needs_confirmation", acceptedDefaults: record.acceptedDefaults ? { ...record.acceptedDefaults, eventType: undefined } : undefined };
      }
      return record;
    });
    return { state: { ...parsed,
      defaultCurrency: SUPPORTED_REPORTING_CURRENCIES.includes(parsed.defaultCurrency as ReportingCurrency) ? parsed.defaultCurrency : "EUR",
      records: migrateWalletEvidence(migrated, fixtureRecords.map(item => item.capture)),
    } };
  } catch {
    return { state: seededScenario(), notice: "The saved workspace could not be read. The original notices have been restored." };
  }
}

export function money(value: number, currency: ReportingCurrency) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(value / (currency === "JPY" ? 1 : 100));
}

export function humanDate(record: TransactionLifecycle) {
  const grouped = groupingDate(record), value = grouped.value;
  if (!value) return "Date unavailable";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  const day = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  const shown = grouped.basis === "source_event_date" && value.length > 10 ? `${day}, ${new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date)} UTC` : day;
  return grouped.basis === "user_corrected_date" ? `${shown} · Date corrected by you` : shown;
}

export function counterpart(record: TransactionLifecycle, records: TransactionLifecycle[]) {
  const own = record.relationships.find(rel => rel.kind === "possible_duplicate_of");
  return own ? records.find(item => item.id === own.targetId) : records.find(item => item.relationships.some(rel => rel.kind === "possible_duplicate_of" && rel.targetId === record.id));
}

export function duplicateOwnerId(record: TransactionLifecycle, pair?: TransactionLifecycle) {
  return record.relationships.some(rel => rel.kind === "possible_duplicate_of") ? record.id : pair?.relationships.some(rel => rel.kind === "possible_duplicate_of") ? pair.id : undefined;
}

export function effectLabel(record: TransactionLifecycle, currency: ReportingCurrency) {
  const effect = reportingEventEffect(record, currency), value = effectiveValues(record);
  if (record.disposition === "excluded") return "Excluded · zero effect";
  if (effect.inflowMinor) return `+${money(effect.inflowMinor, currency)}`;
  if (effect.outflowMinor) return `−${money(effect.outflowMinor, currency)}`;
  if (effect.unclassifiedAmountMinor) return `${money(effect.unclassifiedAmountMinor, currency)} unclassified`;
  if (value.amountMinor !== undefined) return value.currency && SUPPORTED_REPORTING_CURRENCIES.includes(value.currency as ReportingCurrency) ? `${money(value.amountMinor, value.currency as ReportingCurrency)} · zero effect` : "Currency unavailable · zero effect";
  return "Amount missing · zero effect";
}
