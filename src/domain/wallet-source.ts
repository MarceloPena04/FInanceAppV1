import type { CanonicalCapture } from "./canonical-capture.ts";
import { effectiveValues, sourceIdentityConflict, type TransactionLifecycle } from "./transaction-lifecycle.ts";
import { createTransactionParser } from "../parser/transaction-parser.ts";

export type ActivityTypeFilter = "all" | "income" | "expense" | "other";
export interface SourceScopeOption { key: string; label: string; group: "bank" | "account" | "assigned" | "other" }

function suffix(reference: string | undefined): string | undefined {
  const digits = reference?.match(/\d{2,4}$/)?.[0];
  return digits ? `••${digits}` : undefined;
}

/** An observed suffix is a display hint; only an explicit reference supplies a filter identity. */
export function walletForRecord(record: TransactionLifecycle): { key?: string; label: string; detail: string; basis: "source" | "user" | "unknown" | "conflict" } {
  const userLabel = record.userOverrides.walletLabel?.trim();
  const observations = record.sourceCandidates.map(item => item.sourceFacts.fundingSource);
  const notices = record.sourceProvenance;
  const institution = observations.findLast(item => item?.institution)?.institution ?? notices.findLast(item => item.institutionName)?.institutionName;
  const accountReference = notices.findLast(item => item.accountReference)?.accountReference;
  const cardReference = notices.findLast(item => item.paymentInstrumentReference)?.paymentInstrumentReference;
  const account = observations.findLast(item => item?.account)?.account ?? suffix(accountReference);
  const card = observations.findLast(item => item?.card)?.card ?? suffix(cardReference);
  const detail = [institution, account && `Account ${account}`, card && `Card ${card}`].filter(Boolean).join(" · ") || "Source not identified";
  if (userLabel) return { key: record.userOverrides.walletId ?? `user:${userLabel.toLowerCase()}`, label: userLabel, detail, basis: "user" };
  if (sourceIdentityConflict(record)) return { label: "Conflicting source details", detail, basis: "conflict" };
  const scope = (institution ?? notices[0]?.provider ?? notices[0]?.sourceType ?? "unknown").trim().toLowerCase();
  if (accountReference) return { key: `account:${scope}:${accountReference}`, label: [institution, `Account ${account ?? "identified"}`].filter(Boolean).join(" · "), detail, basis: "source" };
  if (cardReference) return { key: `card:${scope}:${cardReference}`, label: [institution, `Card ${card ?? "identified"}`].filter(Boolean).join(" · "), detail, basis: "source" };
  return { label: detail, detail, basis: "unknown" };
}

export function walletOptions(records: TransactionLifecycle[]): Array<{ key: string; label: string }> {
  const found = new Map<string, string>();
  records.forEach(record => { const wallet = walletForRecord(record); if (wallet.key) found.set(wallet.key, wallet.label); });
  return [...found].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function bankForRecord(record: TransactionLifecycle): string | undefined {
  const assignedKey = record.userOverrides.walletId;
  if (record.userOverrides.walletLabel && assignedKey?.startsWith("manual:")) return undefined;
  if (record.userOverrides.walletLabel && (assignedKey?.startsWith("account:") || assignedKey?.startsWith("card:"))) {
    const bank = record.userOverrides.walletLabel.split(" · ")[0];
    return bank && !/^(Account|Card)\b/.test(bank) ? bank : undefined;
  }
  const observations = record.sourceCandidates.map(item => item.sourceFacts.fundingSource?.institution);
  const provenance = record.sourceProvenance.map(item => item.institutionName);
  const names = [...observations, ...provenance].filter((name): name is string => !!name);
  if (!names.length || new Set(names.map(name => name.trim().toLowerCase())).size !== 1) return undefined;
  return names[0];
}

/** A bank is a viewing scope, not proof that its notices share one account. */
export function sourceScopeOptions(records: TransactionLifecycle[]): SourceScopeOption[] {
  const banks = new Map<string, SourceScopeOption>();
  records.forEach(record => {
    const name = bankForRecord(record);
    if (name) banks.set(`bank:${name.trim().toLowerCase()}`, { key: `bank:${name.trim().toLowerCase()}`, label: `${name} · all accounts`, group: "bank" });
  });
  const accounts = walletOptions(records).map(wallet => ({ ...wallet, group: wallet.key.startsWith("manual:") ? "assigned" as const : "account" as const }));
  return [
    { key: "all", label: "All sources", group: "other" },
    ...[...banks.values()].sort((a, b) => a.label.localeCompare(b.label)),
    ...accounts,
    { key: "unassigned", label: "Source not identified", group: "other" },
  ];
}

export function recordMatchesSourceScope(record: TransactionLifecycle, key: string): boolean {
  if (key === "all") return true;
  if (key === "unassigned") return !walletForRecord(record).key && !bankForRecord(record);
  if (key.startsWith("bank:")) return bankForRecord(record)?.trim().toLowerCase() === key.slice(5);
  return walletForRecord(record).key === key;
}

export function sourceScopedRecords(records: TransactionLifecycle[], key: string): TransactionLifecycle[] {
  return records.filter(record => recordMatchesSourceScope(record, key));
}

export function filterActivityRecords(records: TransactionLifecycle[], search: string, type: ActivityTypeFilter, walletKey: string): TransactionLifecycle[] {
  const query = search.trim().toLowerCase();
  return records.filter(record => {
    const kind = effectiveValues(record).eventType;
    const direction = ["income", "refund", "reversal"].includes(kind) ? "income" : ["purchase", "generic_expense"].includes(kind) ? "expense" : "other";
    if (type !== "all" && type !== direction) return false;
    const wallet = walletForRecord(record);
    if (walletKey === "unassigned" ? !!wallet.key : walletKey !== "all" && wallet.key !== walletKey) return false;
    if (!query) return true;
    return [effectiveValues(record).merchantText, wallet.label, wallet.detail, ...record.sourceProvenance.map(source => source.provider ?? source.sourceType)].some(value => value?.toLowerCase().includes(query));
  });
}

/** Adds new fictional fixture evidence to old browser snapshots without replaying money decisions. */
export function migrateWalletEvidence(records: TransactionLifecycle[], captures: CanonicalCapture[]): TransactionLifecycle[] {
  const byId = new Map(captures.map(capture => [capture.captureId, capture]));
  const parser = createTransactionParser({ now: () => new Date("2026-09-30T00:00:00.000Z") });
  return records.map(record => {
    const sourceCandidates = record.sourceCandidates.map(candidate => {
      const capture = byId.get(candidate.captureId);
      if (!capture) return candidate;
      const fresh = parser.parse(capture)?.sourceFacts;
      if (!fresh?.fundingSource || candidate.sourceFacts.fundingSource) return candidate;
      return { ...candidate, sourceFacts: { ...candidate.sourceFacts, fundingSource: fresh.fundingSource, evidence: [...candidate.sourceFacts.evidence, ...fresh.evidence.filter(item => ["institution", "account", "card"].includes(item.field))] } };
    });
    const sourceProvenance = record.sourceProvenance.map(source => {
      const capture = byId.get(source.captureId);
      if (!capture) return source;
      return { ...source,
        ...(capture.metadata.institutionName && { institutionName: capture.metadata.institutionName }),
        ...(capture.metadata.accountReference && { accountReference: capture.metadata.accountReference }),
        ...(capture.metadata.paymentInstrumentReference && { paymentInstrumentReference: capture.metadata.paymentInstrumentReference }),
      };
    });
    const migrated = { ...record, sourceCandidates, sourceProvenance };
    return sourceIdentityConflict(migrated) && !record.userOverrides.walletLabel && record.confirmationState === "confirmed"
      ? { ...migrated, confirmationState: "needs_confirmation" as const }
      : migrated;
  });
}
