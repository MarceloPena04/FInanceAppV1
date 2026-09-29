import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CanonicalCapture } from "../domain/canonical-capture";
import type { CandidateStatus, TransactionKind } from "../domain/transaction-candidate";
import type { CaptureFixtureDocument, CaptureFixtureRecord } from "./schema";

const sourceTypes = new Set(["email", "push_notification", "fixture", "other"]);
const candidateStatuses = new Set<CandidateStatus>([
  "detected",
  "incomplete",
  "duplicate",
  "pending_authorization",
  "finalized",
  "reversed",
  "unsupported",
]);
const transactionKinds = new Set<TransactionKind>([
  "purchase",
  "refund",
  "income",
  "reversal",
  "withdrawal",
  "transfer",
  "unknown",
]);
const forbiddenCaptureKeys = new Set(["amount", "amountMinor", "merchant", "category", "currency"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid capture fixture: ${message}`);
}

function assertOptionalString(value: unknown, path: string): void {
  assert(value === undefined || typeof value === "string", `${path} must be a string when present`);
}

function assertEvidence(value: unknown, path: string): void {
  assert(Array.isArray(value) && value.length > 0, `${path} must contain at least one source excerpt`);
  for (const [index, evidence] of value.entries()) {
    assert(isRecord(evidence), `${path}[${index}] must be an object`);
    assert(
      evidence.field === "amount" ||
        evidence.field === "currency" ||
        evidence.field === "occurredAt" ||
        evidence.field === "merchantText" ||
        evidence.field === "kind",
      `${path}[${index}].field is invalid`,
    );
    assert(typeof evidence.excerpt === "string" && evidence.excerpt.length > 0, `${path}[${index}].excerpt is required`);
  }
}

function assertCapture(value: unknown, path: string): asserts value is CanonicalCapture {
  assert(isRecord(value), `${path} must be an object`);
  for (const forbiddenKey of forbiddenCaptureKeys) {
    assert(!(forbiddenKey in value), `${path}.${forbiddenKey} is a parsed field and does not belong in a capture`);
  }
  assert(typeof value.captureId === "string" && value.captureId.length > 0, `${path}.captureId is required`);
  assert(typeof value.sourceType === "string" && sourceTypes.has(value.sourceType), `${path}.sourceType is invalid`);
  assertOptionalString(value.provider, `${path}.provider`);
  assert(
    value.capturedAt === undefined || (typeof value.capturedAt === "string" && !Number.isNaN(Date.parse(value.capturedAt))),
    `${path}.capturedAt must be an ISO timestamp when present`,
  );
  assert(typeof value.rawText === "string" && value.rawText.length > 0, `${path}.rawText is required`);
  assert(isRecord(value.metadata), `${path}.metadata must be an object`);
  for (const [key, metadataValue] of Object.entries(value.metadata)) {
    assert(
      metadataValue === null || ["string", "number", "boolean"].includes(typeof metadataValue),
      `${path}.metadata.${key} must be a primitive value`,
    );
  }
}

function assertExpected(value: unknown, path: string): void {
  assert(isRecord(value), `${path} must be an object`);
  assert(value.outcome === "candidate" || value.outcome === "no_candidate", `${path}.outcome is invalid`);
  if (value.outcome === "no_candidate") {
    assert(typeof value.reason === "string" && value.reason.length > 0, `${path}.reason is required`);
    return;
  }

  assert(isRecord(value.candidate), `${path}.candidate is required`);
  assert(typeof value.candidate.status === "string" && candidateStatuses.has(value.candidate.status as CandidateStatus), `${path}.candidate.status is invalid`);
  assert(isRecord(value.candidate.sourceFacts), `${path}.candidate.sourceFacts is required`);
  const facts = value.candidate.sourceFacts;
  assert(facts.amountMinor === undefined || (typeof facts.amountMinor === "number" && Number.isInteger(facts.amountMinor)), `${path}.candidate.sourceFacts.amountMinor must be an integer when present`);
  assert(facts.currency === undefined || (typeof facts.currency === "string" && /^[A-Z]{3}$/.test(facts.currency)), `${path}.candidate.sourceFacts.currency must be a three-letter uppercase code when present`);
  assertOptionalString(facts.occurredAt, `${path}.candidate.sourceFacts.occurredAt`);
  assertOptionalString(facts.merchantText, `${path}.candidate.sourceFacts.merchantText`);
  assert(facts.kind === undefined || (typeof facts.kind === "string" && transactionKinds.has(facts.kind as TransactionKind)), `${path}.candidate.sourceFacts.kind is invalid`);
  assertEvidence(facts.evidence, `${path}.candidate.sourceFacts.evidence`);
  assert(isRecord(value.candidate.inferred), `${path}.candidate.inferred is required`);
}

export function validateFixtureDocument(value: unknown): CaptureFixtureDocument {
  assert(isRecord(value), "document must be an object");
  assert(value.schemaVersion === 1, "schemaVersion must be 1");
  assert(Array.isArray(value.records) && value.records.length > 0, "records must be a non-empty array");

  const recordIds = new Set<string>();
  const captureIds = new Set<string>();
  for (const [index, record] of value.records.entries()) {
    const path = `records[${index}]`;
    assert(isRecord(record), `${path} must be an object`);
    assert(typeof record.id === "string" && record.id.length > 0, `${path}.id is required`);
    assert(!recordIds.has(record.id), `${path}.id must be unique`);
    recordIds.add(record.id);
    assertCapture(record.capture, `${path}.capture`);
    assert(!captureIds.has(record.capture.captureId), `${path}.capture.captureId must be unique`);
    captureIds.add(record.capture.captureId);
    assertExpected(record.expected, `${path}.expected`);
    if (record.relationship !== undefined) {
      assert(isRecord(record.relationship), `${path}.relationship must be an object`);
      assert(record.relationship.kind === "exact_duplicate_of" || record.relationship.kind === "same_conceptual_transaction", `${path}.relationship.kind is invalid`);
      assert(typeof record.relationship.group === "string" && record.relationship.group.length > 0, `${path}.relationship.group is required`);
    }
  }
  return value as unknown as CaptureFixtureDocument;
}

export function loadFixtureDocument(json: string): CaptureFixtureDocument {
  return validateFixtureDocument(JSON.parse(json));
}

export function loadDefaultFixtureDocument(): CaptureFixtureDocument {
  const filename = fileURLToPath(new URL("./data/capture-fixtures.json", import.meta.url));
  return loadFixtureDocument(readFileSync(filename, "utf8"));
}

export function fixtureCaptures(document = loadDefaultFixtureDocument()): CanonicalCapture[] {
  return document.records.map((record: CaptureFixtureRecord) => record.capture);
}
