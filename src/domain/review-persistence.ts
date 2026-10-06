import type { CanonicalCapture } from "./canonical-capture";
import type { TransactionLifecycle } from "./transaction-lifecycle";

/**
 * The deliberately small durable boundary for the fictional demo. In the UI
 * this JSON lives in localStorage. A deleted event is removed completely from
 * this snapshot; only its stable source identities remain as replay markers.
 */
export interface ReviewSnapshot {
  version: 1;
  records: TransactionLifecycle[];
  deletedSourceIdentities: string[];
  sourceCurrencyRules: Array<{ profile: string; currency: string }>;
}

export const EMPTY_REVIEW_SNAPSHOT: ReviewSnapshot = {
  version: 1,
  records: [],
  deletedSourceIdentities: [],
  sourceCurrencyRules: [],
};

export function sourceIdentityFor(capture: CanonicalCapture): string {
  return `${capture.provider ?? capture.sourceType}:${capture.metadata.externalId ?? capture.captureId}`;
}

export function removeEventPermanently(snapshot: ReviewSnapshot, eventId: string): ReviewSnapshot {
  const record = snapshot.records.find((item) => item.id === eventId);
  if (!record) return snapshot;
  const markers = new Set(snapshot.deletedSourceIdentities);
  record.sourceProvenance.forEach((item) => markers.add(item.sourceIdentity));
  return {
    ...snapshot,
    records: snapshot.records.filter((item) => item.id !== eventId),
    deletedSourceIdentities: [...markers].sort(),
  };
}

/** A replay gate only; it cannot restore deleted event content or its history. */
export function isReplaySuppressed(snapshot: ReviewSnapshot, capture: CanonicalCapture): boolean {
  return snapshot.deletedSourceIdentities.includes(sourceIdentityFor(capture));
}

export function serializeSnapshot(snapshot: ReviewSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseSnapshot(value: string | null): ReviewSnapshot | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<ReviewSnapshot>;
    if (parsed.version !== 1 || !Array.isArray(parsed.records) || !Array.isArray(parsed.deletedSourceIdentities) || !Array.isArray(parsed.sourceCurrencyRules)) return undefined;
    return parsed as ReviewSnapshot;
  } catch {
    return undefined;
  }
}
