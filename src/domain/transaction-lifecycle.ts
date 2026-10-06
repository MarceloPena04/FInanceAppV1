import type { CanonicalCapture } from "./canonical-capture";
import type {
  CandidateConfirmationState,
  CandidateDisposition,
  CandidateSettlementState,
  SourceDerivedFacts,
  TransactionCandidate,
  TransactionKind,
} from "./transaction-candidate";

export type DeletionState = "active" | "soft_deleted";
export type TransactionRelationshipKind =
  | "duplicate_of"
  | "possible_duplicate_of"
  | "separate_from"
  | "refund_of"
  | "reverses"
  | "settlement_update_of";

export interface TransactionRelationship {
  kind: TransactionRelationshipKind;
  targetId: string;
  /** Concrete observed matches; never a fabricated confidence score. */
  reasons?: string[];
}

export interface SourceProvenance {
  captureId: string;
  sourceIdentity: string;
  sourceType: CanonicalCapture["sourceType"];
  provider?: string;
  sourceEventId?: string;
  transactionReference?: string;
  institutionName?: string;
  accountReference?: string;
  paymentInstrumentReference?: string;
}

/** Values deliberately owned by the user, never overwritten by parsing. */
export interface UserTransactionOverrides {
  amountMinor?: number;
  currency?: string;
  occurredAt?: string;
  eventType?: TransactionKind;
  merchantLabel?: string;
  category?: string;
  comment?: string;
  /** A person's wallet label is separate from every source observation. */
  walletLabel?: string;
  walletId?: string;
}

/** The current system reading of source evidence. It can be recomputed later. */
export interface SystemTransactionInterpretation {
  amountMinor?: number;
  currency?: string;
  merchantText?: string;
  occurredAt?: string;
  eventType: TransactionKind;
  settlementState: CandidateSettlementState;
}

export interface ReviewAction {
  id: string;
  at: string;
  kind: "confirmed" | "confirmation_undone" | "excluded" | "restored" | "edited" | "duplicate_decision" | "evidence_update";
  detail: string;
}

/**
 * One economic event. `sourceCandidates` is append-only provenance: a later
 * observation may update the interpretation but cannot erase the earlier one.
 */
export interface TransactionLifecycle {
  id: string;
  sourceIdentity: string;
  sourceCandidates: TransactionCandidate[];
  sourceProvenance: SourceProvenance[];
  interpretation: SystemTransactionInterpretation;
  userOverrides: UserTransactionOverrides;
  confirmationState: CandidateConfirmationState;
  disposition: CandidateDisposition;
  deletionState: DeletionState;
  relationships: TransactionRelationship[];
  attentionReasons: string[];
  /** Kept with an active event only; permanent deletion removes this history. */
  actionHistory?: ReviewAction[];
  /** A selected demo default locked when a source omitted its currency. */
  currencyAssumption?: { currency: string; basis: "chosen_app_default" };
  acceptedDefaults?: { eventType?: "generic_expense"; currency?: string; currencyBasis?: "source_profile_rule" | "chosen_app_default" };
  evidenceConflict?: string;
  duplicateReviewBefore?: CandidateConfirmationState;
}

export interface EffectiveTransactionValues {
  amountMinor?: number;
  currency?: string;
  merchantText?: string;
  occurredAt?: string;
  eventType: TransactionKind | "generic_expense";
  /** Where the displayed currency comes from. Source facts remain separate. */
  currencyBasis?: "user_corrected" | "source" | "assumed_default";
  /** A date-only correction remains date-only and never supplies a time. */
  occurredAtBasis?: "user_corrected_date" | "source_event_date";
}

export interface CurrencyDetectedMetrics {
  currency: string;
  detectedOutflowMinor: number;
  detectedInflowMinor: number;
  detectedNetFlowMinor: number;
  /** Explicit assumption for an amount-and-currency event whose type is unknown. */
  provisionalOutflowMinor: number;
  awaitingConfirmation: {
    count: number;
    detectedOutflowMinor: number;
    detectedInflowMinor: number;
  };
  byEventType: Partial<Record<TransactionKind | "generic_expense", { inflowMinor: number; outflowMinor: number }>>;
}

export interface DetectedMetrics {
  byCurrency: CurrencyDetectedMetrics[];
  awaitingConfirmationCount: number;
  unaggregatedActiveCount: number;
}

function sourceIdentity(capture: CanonicalCapture): string {
  const source = capture.provider ?? capture.sourceType;
  const record = capture.metadata.externalId ?? capture.captureId;
  return `${source}:${record}`;
}

function sourceName(capture: CanonicalCapture): string {
  return capture.provider ?? capture.sourceType;
}

function transactionReference(capture: CanonicalCapture): string | undefined {
  const reference = capture.metadata.transactionReference;
  return typeof reference === "string" && reference.length > 0 ? reference : undefined;
}

function settlementFromEvidence(candidate: TransactionCandidate): CandidateSettlementState {
  const excerpts = candidate.sourceFacts.evidence.map(({ excerpt }) => excerpt).join(" ");
  if (/\bpending authorization\b/i.test(excerpts)) return "pending";
  if (/\b(?:transaction )?finalized\b/i.test(excerpts)) return "finalized";
  return "unknown";
}

function interpretationFrom(candidate: TransactionCandidate): SystemTransactionInterpretation {
  const facts = candidate.sourceFacts;
  return {
    ...(facts.amountMinor !== undefined && { amountMinor: facts.amountMinor }),
    ...(facts.currency && { currency: facts.currency }),
    ...(facts.merchantText && { merchantText: facts.merchantText }),
    ...(facts.occurredAt && { occurredAt: facts.occurredAt }),
    eventType: facts.kind ?? "unknown",
    settlementState: settlementFromEvidence(candidate),
  };
}

function attentionReasons(interpretation: SystemTransactionInterpretation): string[] {
  const reasons: string[] = [];
  if (interpretation.amountMinor === undefined) reasons.push("missing_amount");
  if (!interpretation.currency) reasons.push("missing_currency");
  if (interpretation.eventType === "unknown") reasons.push("ambiguous_classification");
  return reasons;
}

function materialFingerprint(interpretation: SystemTransactionInterpretation): string {
  return JSON.stringify({
    amountMinor: interpretation.amountMinor,
    currency: interpretation.currency,
    merchantText: interpretation.merchantText,
    occurredAt: interpretation.occurredAt,
    eventType: interpretation.eventType,
    settlementState: interpretation.settlementState,
  });
}

function appendSourceCandidate(record: TransactionLifecycle, candidate: TransactionCandidate): TransactionCandidate[] {
  return record.sourceCandidates.some(({ captureId }) => captureId === candidate.captureId)
    ? record.sourceCandidates
    : [...record.sourceCandidates, candidate];
}

function provenanceFrom(capture: CanonicalCapture): SourceProvenance {
  return {
    captureId: capture.captureId,
    sourceIdentity: sourceIdentity(capture),
    sourceType: capture.sourceType,
    ...(capture.provider && { provider: capture.provider }),
    ...(capture.metadata.externalId && { sourceEventId: capture.metadata.externalId }),
    ...(transactionReference(capture) && { transactionReference: transactionReference(capture) }),
    ...(capture.metadata.institutionName && { institutionName: capture.metadata.institutionName }),
    ...(capture.metadata.accountReference && { accountReference: capture.metadata.accountReference }),
    ...(capture.metadata.paymentInstrumentReference && { paymentInstrumentReference: capture.metadata.paymentInstrumentReference }),
  };
}

function appendProvenance(record: TransactionLifecycle, capture: CanonicalCapture): SourceProvenance[] {
  return record.sourceProvenance.some(({ captureId }) => captureId === capture.captureId)
    ? record.sourceProvenance
    : [...record.sourceProvenance, provenanceFrom(capture)];
}

function normalizedMerchant(value: string | undefined): string | undefined {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function exactTimestamp(value: string | undefined): string | undefined {
  return value && /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ? value : undefined;
}

function hasSourcePrecision(candidate: TransactionCandidate, timestamp: string | undefined): boolean {
  return candidate.sourceFacts.occurredAt === timestamp && candidate.sourceFacts.evidence.some(
    (evidence) => evidence.field === "occurredAt" && /T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(evidence.excerpt),
  );
}

/** Competing explicit identities stay visible until a person resolves the wallet. */
export function sourceIdentityConflict(record: TransactionLifecycle): boolean {
  const differing = (values: Array<string | undefined>) => new Set(values.filter((value): value is string => !!value).map(value => value.trim().toLowerCase())).size > 1;
  const sources = record.sourceCandidates.map(item => item.sourceFacts.fundingSource);
  const notices = record.sourceProvenance;
  const contradictoryCapture = record.sourceCandidates.some(candidate => {
    const observed = candidate.sourceFacts.fundingSource;
    const notice = notices.find(item => item.captureId === candidate.captureId);
    if (!observed || !notice) return false;
    const suffix = (reference: string | undefined) => reference?.match(/\d{2,4}$/)?.[0];
    return !!(observed.institution && notice.institutionName && observed.institution.toLowerCase() !== notice.institutionName.toLowerCase()) ||
      !!(observed.account && suffix(notice.accountReference) && !observed.account.endsWith(suffix(notice.accountReference)!)) ||
      !!(observed.card && suffix(notice.paymentInstrumentReference) && !observed.card.endsWith(suffix(notice.paymentInstrumentReference)!));
  });
  return contradictoryCapture || differing(sources.map(source => source?.institution)) ||
    differing(sources.map(source => source?.account)) ||
    differing(sources.map(source => source?.card)) ||
    differing(notices.map(source => source.institutionName)) ||
    differing(notices.map(source => source.accountReference)) ||
    differing(notices.map(source => source.paymentInstrumentReference));
}

function exactCrossSourceMatch(
  record: TransactionLifecycle,
  candidate: TransactionCandidate,
  capture: CanonicalCapture,
): boolean {
  if (record.sourceProvenance.some((item) => item.sourceIdentity.startsWith(`${sourceName(capture)}:`))) return false;
  const left = record.interpretation;
  const right = interpretationFrom(candidate);
  const incomingSource = candidate.sourceFacts.fundingSource;
  if (record.sourceCandidates.some(item => {
    const existingSource = item.sourceFacts.fundingSource;
    return (["institution", "account", "card"] as const).some(field => existingSource?.[field] && incomingSource?.[field] && existingSource[field]?.toLowerCase() !== incomingSource[field]?.toLowerCase());
  })) return false;
  if (
    (left.settlementState === "pending" && right.settlementState === "finalized") ||
    (left.settlementState === "finalized" && right.settlementState === "pending")
  ) return false;
  return left.amountMinor !== undefined && left.amountMinor === right.amountMinor &&
    !!left.currency && left.currency === right.currency &&
    !!exactTimestamp(left.occurredAt) && exactTimestamp(left.occurredAt) === exactTimestamp(right.occurredAt) &&
    record.sourceCandidates.some((item) => hasSourcePrecision(item, left.occurredAt)) && hasSourcePrecision(candidate, right.occurredAt) &&
    left.eventType === right.eventType &&
    !!normalizedMerchant(left.merchantText) && normalizedMerchant(left.merchantText) === normalizedMerchant(right.merchantText) &&
    !record.sourceProvenance.some((item) => {
      const incomingBank = capture.metadata.institutionName;
      if (item.institutionName && incomingBank && item.institutionName.toLowerCase() !== incomingBank.toLowerCase()) return true;
      const oldAccount = item.accountReference, newAccount = capture.metadata.accountReference;
      const oldCard = item.paymentInstrumentReference, newCard = capture.metadata.paymentInstrumentReference;
      if (oldAccount && newAccount) return oldAccount !== newAccount || !!oldCard && !!newCard && oldCard !== newCard;
      if (oldCard && newCard) return oldCard !== newCard;
      return !!(oldAccount || oldCard || newAccount || newCard);
    });
}

function possibleDuplicateReasons(record: TransactionLifecycle, candidate: TransactionCandidate): string[] {
  const left = record.interpretation;
  const right = interpretationFrom(candidate);
  const reasons: string[] = [];
  if (left.amountMinor !== undefined && left.amountMinor === right.amountMinor) reasons.push("same_amount");
  if (left.currency && left.currency === right.currency) reasons.push("same_currency");
  if (left.eventType === right.eventType) reasons.push("same_event_type");
  if (normalizedMerchant(left.merchantText) && normalizedMerchant(left.merchantText) === normalizedMerchant(right.merchantText)) {
    reasons.push("same_normalized_merchant");
  }
  if (left.occurredAt && left.occurredAt === right.occurredAt) reasons.push("same_observed_timestamp");
  return reasons;
}

function isPossibleDuplicate(reasons: string[]): boolean {
  return ["same_amount", "same_currency", "same_event_type", "same_normalized_merchant"].every((reason) =>
    reasons.includes(reason),
  );
}

function interpretationAfterEvidence(
  existing: SystemTransactionInterpretation,
  incoming: SystemTransactionInterpretation,
): SystemTransactionInterpretation {
  // A later pending notice cannot replace a finalized reading of the same
  // referenced event. A later finalized notice can, including its amount.
  if (existing.settlementState === "finalized" && incoming.settlementState === "pending") return existing;
  return incoming;
}

export function effectiveValues(record: TransactionLifecycle): EffectiveTransactionValues {
  const currency = record.userOverrides.currency ??
    (record.evidenceConflict ? record.currencyAssumption?.currency : undefined) ??
    record.interpretation.currency ?? record.currencyAssumption?.currency ??
    (record.evidenceConflict ? record.acceptedDefaults?.currency : undefined) ?? record.acceptedDefaults?.currency;
  const currencyBasis = record.userOverrides.currency !== undefined ? "user_corrected" as const :
    record.evidenceConflict && record.currencyAssumption?.currency ? "assumed_default" as const :
    record.interpretation.currency ? "source" as const :
    record.currencyAssumption?.currency ? "assumed_default" as const :
    record.acceptedDefaults?.currency ? "assumed_default" as const : undefined;
  return {
    ...(record.userOverrides.amountMinor !== undefined
      ? { amountMinor: record.userOverrides.amountMinor }
      : record.interpretation.amountMinor !== undefined && { amountMinor: record.interpretation.amountMinor }),
    ...(currency ? { currency } : {}),
    ...(record.userOverrides.merchantLabel !== undefined
      ? { merchantText: record.userOverrides.merchantLabel }
      : record.interpretation.merchantText && { merchantText: record.interpretation.merchantText }),
    ...(record.userOverrides.occurredAt ?? record.interpretation.occurredAt
      ? { occurredAt: record.userOverrides.occurredAt ?? record.interpretation.occurredAt }
      : {}),
    eventType: record.userOverrides.eventType ?? record.interpretation.eventType,
    ...(currencyBasis ? { currencyBasis } : {}),
    ...(record.userOverrides.occurredAt !== undefined
      ? { occurredAtBasis: "user_corrected_date" as const }
      : record.interpretation.occurredAt ? { occurredAtBasis: "source_event_date" as const } : {}),
  };
}

export function confirm(record: TransactionLifecycle): TransactionLifecycle {
  if (!canConfirm(record)) return record;
  return { ...record, confirmationState: "confirmed" };
}

export function confirmAll(records: TransactionLifecycle[]): TransactionLifecycle[] {
  return records.map((record) => canConfirm(record) ? confirm(record) : record);
}

/** Confirmation needs an explicit money direction and usable currency. */
export function canConfirm(record: TransactionLifecycle): boolean {
  const values = effectiveValues(record);
  return record.disposition === "active" && record.deletionState === "active" &&
    values.amountMinor !== undefined && !!values.currency && values.eventType !== "unknown" && !record.evidenceConflict &&
    (!sourceIdentityConflict(record) || !!record.userOverrides.walletLabel);
}

export function setDisposition(record: TransactionLifecycle, disposition: CandidateDisposition): TransactionLifecycle {
  return { ...record, disposition };
}

export function setUserOverrides(
  record: TransactionLifecycle,
  overrides: UserTransactionOverrides,
): TransactionLifecycle {
  return { ...record, userOverrides: { ...record.userOverrides, ...overrides } };
}

export function clearUserOverrides(
  record: TransactionLifecycle,
  fields: Array<keyof UserTransactionOverrides>,
): TransactionLifecycle {
  const userOverrides = { ...record.userOverrides };
  for (const field of fields) delete userOverrides[field];
  return { ...record, userOverrides };
}

export function addRelationship(
  record: TransactionLifecycle,
  relationship: TransactionRelationship,
): TransactionLifecycle {
  if (record.relationships.some((item) => item.kind === relationship.kind && item.targetId === relationship.targetId)) {
    return record;
  }
  return { ...record, relationships: [...record.relationships, relationship] };
}

function contributesToMetrics(record: TransactionLifecycle): boolean {
  return record.disposition === "active" && record.deletionState === "active" &&
    !record.relationships.some(({ kind }) => kind === "duplicate_of");
}

export function eventImpact(eventType: TransactionKind | "generic_expense"): { inflow: boolean; outflow: boolean } {
  if (eventType === "purchase" || eventType === "generic_expense") return { inflow: false, outflow: true };
  if (eventType === "income" || eventType === "refund" || eventType === "reversal") {
    return { inflow: true, outflow: false };
  }
  // Transfers and withdrawals are intentionally neutral until the product has
  // evidence-backed account/cash ownership. Unknown events are not guessed.
  return { inflow: false, outflow: false };
}

function emptyCurrencyMetrics(currency: string): CurrencyDetectedMetrics {
  return {
    currency,
    detectedOutflowMinor: 0,
    detectedInflowMinor: 0,
    detectedNetFlowMinor: 0,
    provisionalOutflowMinor: 0,
    awaitingConfirmation: { count: 0, detectedOutflowMinor: 0, detectedInflowMinor: 0 },
    byEventType: {},
  };
}

/**
 * Calculates detected activity only. It deliberately never returns a balance
 * or combines currencies. Unknown types have no signed money effect.
 */
export function calculateDetectedMetrics(records: TransactionLifecycle[]): DetectedMetrics {
  const metricsByCurrency = new Map<string, CurrencyDetectedMetrics>();
  const countedEventIds = new Set<string>();
  let awaitingConfirmationCount = 0;
  let unaggregatedActiveCount = 0;

  for (const record of records) {
    if (countedEventIds.has(record.id)) continue;
    countedEventIds.add(record.id);
    if (!contributesToMetrics(record)) continue;
    if (record.confirmationState === "needs_confirmation") awaitingConfirmationCount += 1;

    const values = effectiveValues(record);
    if (values.amountMinor === undefined || !values.currency) {
      unaggregatedActiveCount += 1;
      continue;
    }

    const impact = eventImpact(values.eventType);
    const current = metricsByCurrency.get(values.currency) ?? emptyCurrencyMetrics(values.currency);
    const eventTotals = current.byEventType[values.eventType] ?? { inflowMinor: 0, outflowMinor: 0 };
    if (impact.inflow) {
      current.detectedInflowMinor += values.amountMinor;
      eventTotals.inflowMinor += values.amountMinor;
    }
    if (impact.outflow) {
      current.detectedOutflowMinor += values.amountMinor;
      eventTotals.outflowMinor += values.amountMinor;
    }

    current.detectedNetFlowMinor = current.detectedInflowMinor - current.detectedOutflowMinor;
    current.byEventType[values.eventType] = eventTotals;
    if (record.confirmationState === "needs_confirmation") {
      current.awaitingConfirmation.count += 1;
      if (impact.inflow) current.awaitingConfirmation.detectedInflowMinor += values.amountMinor;
      if (impact.outflow) current.awaitingConfirmation.detectedOutflowMinor += values.amountMinor;
    }
    metricsByCurrency.set(values.currency, current);
  }

  return {
    byCurrency: [...metricsByCurrency.values()].sort((left, right) => left.currency.localeCompare(right.currency)),
    awaitingConfirmationCount,
    unaggregatedActiveCount,
  };
}

export type DateBasis = "user_corrected_date" | "source_event_date" | "source_message_date" | "first_seen";

/** Date-only source values stay date-only; UTC is only this fictional demo's grouping convention. */
export function groupingDate(record: TransactionLifecycle): { value?: string; basis: DateBasis } {
  const values = effectiveValues(record);
  if (record.userOverrides.occurredAt !== undefined) return { value: record.userOverrides.occurredAt, basis: "user_corrected_date" };
  if (values.occurredAt) return { value: values.occurredAt, basis: "source_event_date" };
  const capturedAt = record.sourceCandidates.find((item) => item.capturedAt)?.capturedAt;
  if (capturedAt) return { value: capturedAt, basis: "source_message_date" };
  return { value: record.sourceCandidates[0]?.processedAt, basis: "first_seen" };
}

export function calculateCalendarWeekMetrics(records: TransactionLifecycle[], weekStartDate: string): DetectedMetrics {
  const start = new Date(`${weekStartDate}T00:00:00Z`).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return calculateDetectedMetrics(records.filter((record) => {
    const grouped = groupingDate(record).value;
    if (!grouped) return false;
    const instant = new Date(grouped.length === 10 ? `${grouped}T00:00:00Z` : grouped).getTime();
    return Number.isFinite(instant) && instant >= start && instant < end;
  }));
}

/** Small in-memory coordinator for the Sprint 1 fixture path; it is not persistence. */
export class TransactionLifecycleStore {
  private readonly recordsBySourceIdentity = new Map<string, TransactionLifecycle>();
  private readonly recordsById = new Map<string, TransactionLifecycle>();
  private readonly recordsByTransactionReference = new Map<string, TransactionLifecycle>();

  /** Stores a user action without changing its captured/source provenance. */
  save(record: TransactionLifecycle): TransactionLifecycle {
    for (const provenance of record.sourceProvenance) {
      this.recordsBySourceIdentity.set(provenance.sourceIdentity, record);
      if (provenance.transactionReference) this.recordsByTransactionReference.set(provenance.transactionReference, record);
    }
    this.recordsById.set(record.id, record);
    return record;
  }

  constructor(records: TransactionLifecycle[] = []) { records.forEach((record) => this.save(record)); }

  /** The current unique economic events, useful for the fixture-only path. */
  records(): TransactionLifecycle[] {
    return [...this.recordsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  upsert(candidate: TransactionCandidate, capture: CanonicalCapture, economicEventId?: string): TransactionLifecycle {
    const identity = sourceIdentity(capture);
    const incomingInterpretation = interpretationFrom(candidate);
    const byReference = transactionReference(capture);
    const existing = this.recordsBySourceIdentity.get(identity) ??
      (byReference ? this.recordsByTransactionReference.get(byReference) : undefined) ??
      (economicEventId ? this.recordsById.get(economicEventId) : undefined) ??
      [...this.recordsById.values()].find((record) => exactCrossSourceMatch(record, candidate, capture));

    if (!existing) {
      const record: TransactionLifecycle = {
        id: economicEventId ?? `event:${identity}`,
        sourceIdentity: identity,
        sourceCandidates: [candidate],
        sourceProvenance: [provenanceFrom(capture)],
        interpretation: incomingInterpretation,
        userOverrides: {},
        confirmationState: "needs_confirmation",
        disposition: "active",
        deletionState: "active",
        relationships: [],
        attentionReasons: attentionReasons(incomingInterpretation),
      };
      const possibleMatch = [...this.recordsById.values()]
        .map((other) => ({ other, reasons: possibleDuplicateReasons(other, candidate) }))
        .filter(({ other, reasons }) => other.sourceIdentity !== identity && isPossibleDuplicate(reasons))
        .sort(({ other: left }, { other: right }) => left.id.localeCompare(right.id))[0];
      return this.save(possibleMatch
        ? addRelationship(record, { kind: "possible_duplicate_of", targetId: possibleMatch.other.id, reasons: possibleMatch.reasons })
        : record);
    }

    // Re-seeing an already stored capture is provenance-only. It must never roll
    // a later source reading or a person's review decision back in time.
    const alreadySeenCapture = existing.sourceCandidates.some(item => item.captureId === candidate.captureId);
    const interpretation = alreadySeenCapture ? existing.interpretation : interpretationAfterEvidence(existing.interpretation, incomingInterpretation);
    const changed = materialFingerprint(existing.interpretation) !== materialFingerprint(interpretation);
    const candidates = appendSourceCandidate(existing, candidate);
    const provenance = appendProvenance(existing, capture);
    const identityConflict = sourceIdentityConflict({ ...existing, sourceCandidates: candidates, sourceProvenance: provenance });
    const newIdentityConflict = identityConflict && !sourceIdentityConflict(existing);
    const updated: TransactionLifecycle = {
      ...existing,
      sourceCandidates: candidates,
      sourceProvenance: provenance,
      interpretation: changed ? interpretation : existing.interpretation,
      ...((changed || newIdentityConflict) && existing.confirmationState === "confirmed" && { confirmationState: "needs_confirmation" as const }),
      ...(changed && { attentionReasons: attentionReasons(interpretation) }),
      ...(changed && existing.confirmationState === "confirmed" && (existing.acceptedDefaults || existing.currencyAssumption) && {
        evidenceConflict: [
          existing.currencyAssumption?.currency && interpretation.currency && existing.currencyAssumption.currency !== interpretation.currency ? `Assumed default currency ${existing.currencyAssumption.currency}; new source currency ${interpretation.currency}` : "",
          existing.acceptedDefaults?.currency && interpretation.currency && existing.acceptedDefaults.currency !== interpretation.currency ? `Accepted default currency ${existing.acceptedDefaults.currency}; new source currency ${interpretation.currency}` : "",
          existing.acceptedDefaults?.eventType && interpretation.eventType !== "unknown" && interpretation.eventType !== "purchase" ? `Accepted generic expense; new source type ${interpretation.eventType}` : "",
        ].filter(Boolean).join("; ") || undefined,
      }),
      ...(changed && { actionHistory: [...(existing.actionHistory ?? []), { id: `${existing.id}:evidence:${candidate.captureId}`, at: candidate.processedAt, kind: "evidence_update" as const, detail: `New source reading: amount ${existing.interpretation.amountMinor ?? "missing"} → ${interpretation.amountMinor ?? "missing"}; currency ${existing.interpretation.currency ?? "missing"} → ${interpretation.currency ?? "missing"}; type ${existing.interpretation.eventType} → ${interpretation.eventType}. Confirmation requires review.` }] }),
    };
    return this.save(updated);
  }
}

export function sourceFacts(record: TransactionLifecycle): SourceDerivedFacts[] {
  return record.sourceCandidates.map((candidate) => candidate.sourceFacts);
}
