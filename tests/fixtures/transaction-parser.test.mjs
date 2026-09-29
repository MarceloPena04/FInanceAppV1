import assert from "node:assert/strict";
import test from "node:test";

import { loadDefaultFixtureDocument } from "../../src/fixtures/loader.ts";
import { createTransactionParser } from "../../src/parser/transaction-parser.ts";

const processedAt = "2026-09-28T12:00:00.000Z";
const parser = createTransactionParser({ now: () => new Date(processedAt) });

function record(id) {
  const fixture = loadDefaultFixtureDocument().records.find((entry) => entry.id === id);
  assert.ok(fixture, `fixture ${id} should exist`);
  return fixture;
}

test("each fixture outcome is produced without parser state or provider-specific behavior", () => {
  for (const fixture of loadDefaultFixtureDocument().records) {
    const candidate = parser.parse(fixture.capture);

    if (fixture.expected.outcome === "no_candidate") {
      assert.equal(candidate, undefined, fixture.id);
      continue;
    }

    assert.ok(candidate, fixture.id);
    assert.equal(candidate.status, fixture.expected.candidate.status, fixture.id);
    assert.equal(candidate.captureId, fixture.capture.captureId, fixture.id);
    assert.equal(candidate.capturedAt, fixture.capture.capturedAt, fixture.id);
    assert.equal(candidate.processedAt, processedAt, fixture.id);
    assert.deepEqual(candidate.inferred, {}, fixture.id);

    const { evidence: expectedEvidence, ...expectedFacts } = fixture.expected.candidate.sourceFacts;
    assert.deepEqual(
      Object.fromEntries(Object.keys(expectedFacts).map((key) => [key, candidate.sourceFacts[key]])),
      expectedFacts,
      fixture.id,
    );
    for (const evidence of expectedEvidence) {
      assert.ok(
        candidate.sourceFacts.evidence.some(
          (actual) => actual.field === evidence.field && actual.excerpt === evidence.excerpt,
        ),
        `${fixture.id} preserves ${evidence.field} evidence`,
      );
    }
  }
});

test("an amount without a merchant or an occurred-at date is still detected", () => {
  for (const id of ["missing-merchant", "purchase-without-date"]) {
    const candidate = parser.parse(record(id).capture);
    assert.equal(candidate?.status, "detected", id);
  }
});

test("an amount without currency stays detected without a default currency", () => {
  const candidate = parser.parse(record("payment-without-currency").capture);
  assert.equal(candidate?.status, "detected");
  assert.equal(candidate?.sourceFacts.amountMinor, 1750);
  assert.equal(candidate?.sourceFacts.currency, undefined);
  assert.ok(candidate?.sourceFacts.evidence.some((evidence) => evidence.field === "amount" && evidence.excerpt === "17.50"));
});

test("a missing captured-at value is preserved as missing while processing time remains traceable", () => {
  const candidate = parser.parse(record("purchase-without-captured-at").capture);
  assert.equal(candidate?.capturedAt, undefined);
  assert.equal(candidate?.processedAt, processedAt);
});

test("the parser preserves explicit event time without treating captured time as event time", () => {
  const withEventDate = parser.parse(record("normal-purchase-email-eur").capture);
  assert.equal(withEventDate?.sourceFacts.occurredAt, "2026-09-27");
  assert.equal(withEventDate?.capturedAt, "2026-09-28T08:42:00Z");

  const withoutEventDate = parser.parse(record("purchase-without-date").capture);
  assert.equal(withoutEventDate?.sourceFacts.occurredAt, undefined);
  assert.equal(withoutEventDate?.capturedAt, "2026-09-09T12:00:00Z");
});

test("JPY is kept in its explicit zero-decimal minor-unit amount", () => {
  const candidate = parser.parse(record("purchase-jpy-email").capture);
  assert.equal(candidate?.sourceFacts.amountMinor, 1200);
  assert.equal(candidate?.sourceFacts.currency, "JPY");
});
