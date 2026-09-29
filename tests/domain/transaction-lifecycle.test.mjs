import assert from "node:assert/strict";
import test from "node:test";

import { loadDefaultFixtureDocument } from "../../src/fixtures/loader.ts";
import { createTransactionParser } from "../../src/parser/transaction-parser.ts";
import {
  TransactionLifecycleStore,
  addRelationship,
  calculateDetectedMetrics,
  clearUserOverrides,
  confirm,
  confirmAll,
  effectiveValues,
  setDisposition,
  setUserOverrides,
  sourceFacts,
} from "../../src/domain/transaction-lifecycle.ts";

const parser = createTransactionParser({ now: () => new Date("2026-09-29T09:00:00.000Z") });
const fixtures = loadDefaultFixtureDocument();

function fixture(id) {
  const found = fixtures.records.find((entry) => entry.id === id);
  assert.ok(found, `fixture ${id} should exist`);
  return found;
}

function candidate(id) {
  const parsed = parser.parse(fixture(id).capture);
  assert.ok(parsed, `fixture ${id} should parse`);
  return parsed;
}

function lifecycle(id, economicEventId) {
  const store = new TransactionLifecycleStore();
  return [store, store.upsert(candidate(id), fixture(id).capture, economicEventId)];
}

function metrics(record) {
  return calculateDetectedMetrics([record]);
}

function currencyMetrics(record, currency) {
  const result = metrics(record).byCurrency.find((item) => item.currency === currency);
  assert.ok(result, `expected ${currency} metrics`);
  return result;
}

test("a detected purchase affects outflow before confirmation, and confirmation does not change it", () => {
  const [, record] = lifecycle("normal-purchase-email-eur");
  assert.equal(record.confirmationState, "needs_confirmation");
  assert.deepEqual(currencyMetrics(record, "EUR").awaitingConfirmation, {
    count: 1, detectedOutflowMinor: 1299, detectedInflowMinor: 0,
  });
  assert.equal(currencyMetrics(confirm(record), "EUR").detectedOutflowMinor, 1299);
  assert.equal(currencyMetrics(confirm(record), "EUR").awaitingConfirmation.count, 0);
});

test("an amount correction is effective, preserves confirmation and can be reset", () => {
  const [, record] = lifecycle("normal-purchase-email-eur");
  const corrected = setUserOverrides(confirm(record), { amountMinor: 999, merchantLabel: "My coffee place", category: "food", comment: "receipt checked" });
  assert.equal(currencyMetrics(corrected, "EUR").detectedOutflowMinor, 999);
  assert.equal(corrected.confirmationState, "confirmed");
  assert.equal(sourceFacts(corrected)[0].merchantText, "Blue Kettle Cafe");
  assert.equal(effectiveValues(corrected).merchantText, "My coffee place");
  const reset = clearUserOverrides(corrected, ["amountMinor", "merchantLabel"]);
  assert.equal(currencyMetrics(reset, "EUR").detectedOutflowMinor, 1299);
  assert.equal(effectiveValues(reset).merchantText, "Blue Kettle Cafe");
  assert.equal(reset.userOverrides.category, "food");
});

test("new material evidence resets confirmation but keeps user edits and an identical replay does not", () => {
  const recordFixture = fixture("normal-purchase-email-eur");
  const store = new TransactionLifecycleStore();
  let record = store.save(setUserOverrides(confirm(store.upsert(candidate("normal-purchase-email-eur"), recordFixture.capture)), { amountMinor: 1000 }));
  record = store.upsert(candidate("normal-purchase-email-eur"), recordFixture.capture);
  assert.equal(record.confirmationState, "confirmed");

  const changedCapture = {
    ...recordFixture.capture,
    captureId: "capture-001-new-evidence",
    rawText: "Purchase confirmed: EUR 14.99 at Blue Kettle Cafe on 2026-09-27.",
  };
  const changed = parser.parse(changedCapture);
  assert.ok(changed);
  record = store.upsert(changed, changedCapture);
  assert.equal(record.confirmationState, "needs_confirmation");
  assert.equal(record.userOverrides.amountMinor, 1000);
  assert.equal(record.interpretation.amountMinor, 1499);
});

test("exclusion is reversible, removes impact, and persists on a matching source replay", () => {
  const store = new TransactionLifecycleStore();
  let record = store.save(setDisposition(store.upsert(candidate("duplicate-source-original"), fixture("duplicate-source-original").capture), "excluded"));
  assert.equal(metrics(record).byCurrency.length, 0);
  record = store.upsert(candidate("duplicate-source-replay"), fixture("duplicate-source-replay").capture);
  assert.equal(record.disposition, "excluded");
  assert.equal(metrics(record).byCurrency.length, 0);
  assert.equal(currencyMetrics(setDisposition(record, "active"), "EUR").detectedOutflowMinor, 720);
});

test("same source identity is idempotent while similar distinct records remain separate", () => {
  const store = new TransactionLifecycleStore();
  const original = store.upsert(candidate("duplicate-source-original"), fixture("duplicate-source-original").capture);
  const replay = store.upsert(candidate("duplicate-source-replay"), fixture("duplicate-source-replay").capture);
  assert.equal(original.id, replay.id);
  assert.equal(calculateDetectedMetrics([replay]).byCurrency[0].detectedOutflowMinor, 720);

  const first = store.upsert(candidate("similar-not-duplicate-one"), fixture("similar-not-duplicate-one").capture);
  const second = store.upsert(candidate("similar-not-duplicate-two"), fixture("similar-not-duplicate-two").capture);
  assert.notEqual(first.id, second.id);
  assert.equal(calculateDetectedMetrics([first, second]).byCurrency[0].detectedOutflowMinor, 900);
});

test("a pending event can evolve to finalized as one economic event", () => {
  const store = new TransactionLifecycleStore();
  const pending = store.upsert(candidate("pending-authorization-usd"), fixture("pending-authorization-usd").capture, "event:pending-finalized-001");
  const finalized = store.upsert(candidate("finalized-authorization-usd"), fixture("finalized-authorization-usd").capture, "event:pending-finalized-001");
  assert.equal(pending.id, finalized.id);
  assert.equal(finalized.interpretation.settlementState, "finalized");
  assert.equal(finalized.sourceCandidates.length, 2);
  assert.equal(currencyMetrics(finalized, "USD").detectedOutflowMinor, 4325);
});

test("possible cross-source duplicates stay reviewable and counted until explicitly resolved", () => {
  const store = new TransactionLifecycleStore();
  const email = store.upsert(candidate("normal-purchase-email-eur"), fixture("normal-purchase-email-eur").capture);
  const push = addRelationship(
    store.upsert(candidate("same-purchase-push-eur"), fixture("same-purchase-push-eur").capture),
    { kind: "possible_duplicate_of", targetId: email.id },
  );
  assert.equal(calculateDetectedMetrics([email, push]).byCurrency[0].detectedOutflowMinor, 2598);
  const resolved = addRelationship(push, { kind: "duplicate_of", targetId: email.id });
  assert.equal(calculateDetectedMetrics([email, resolved]).byCurrency[0].detectedOutflowMinor, 1299);
});

test("income, refund, reversal, withdrawal and unknown events have explicit safe impacts", () => {
  const income = lifecycle("credit-income-email-usd")[1];
  const refund = lifecycle("refund-eur")[1];
  const reversal = lifecycle("reversal-eur")[1];
  const withdrawal = lifecycle("withdrawal-needs-classification")[1];
  const unknownCurrency = lifecycle("payment-without-currency")[1];
  assert.equal(currencyMetrics(income, "USD").detectedInflowMinor, 240000);
  assert.equal(currencyMetrics(refund, "EUR").byEventType.refund.inflowMinor, 1840);
  assert.equal(currencyMetrics(reversal, "EUR").byEventType.reversal.inflowMinor, 1500);
  assert.equal(currencyMetrics(withdrawal, "EUR").detectedNetFlowMinor, 0);
  assert.equal(metrics(unknownCurrency).byCurrency.length, 0);
  assert.equal(metrics(unknownCurrency).unaggregatedActiveCount, 1);
});

test("partial and unlinked refunds remain independent records, and bulk confirmation skips exclusions", () => {
  const store = new TransactionLifecycleStore();
  const purchase = store.upsert(candidate("normal-purchase-email-eur"), fixture("normal-purchase-email-eur").capture);
  const partial = store.upsert(candidate("refund-eur"), fixture("refund-eur").capture);
  const unlinked = store.upsert(candidate("refund-push-usd"), fixture("refund-push-usd").capture);
  const related = addRelationship(setUserOverrides(partial, { amountMinor: 300 }), { kind: "refund_of", targetId: purchase.id });
  assert.equal(currencyMetrics(related, "EUR").detectedInflowMinor, 300);
  assert.equal(unlinked.relationships.length, 0);
  const [confirmed, excluded] = confirmAll([purchase, setDisposition(partial, "excluded")]);
  assert.equal(confirmed.confirmationState, "confirmed");
  assert.equal(excluded.confirmationState, "needs_confirmation");
});

test("complete exact cross-source facts merge once, while sparse facts remain a visible possible duplicate", () => {
  const exactStore = new TransactionLifecycleStore();
  const email = exactStore.upsert(candidate("exact-cross-source-email"), fixture("exact-cross-source-email").capture);
  const push = exactStore.upsert(candidate("exact-cross-source-push"), fixture("exact-cross-source-push").capture);
  assert.equal(email.id, push.id);
  assert.equal(push.sourceCandidates.length, 2);
  assert.equal(push.sourceProvenance.length, 2);
  assert.equal(calculateDetectedMetrics([email, push]).byCurrency[0].detectedOutflowMinor, 850);

  const sparseStore = new TransactionLifecycleStore();
  const sparseEmail = sparseStore.upsert(candidate("sparse-cross-source-email"), fixture("sparse-cross-source-email").capture);
  const sparsePush = sparseStore.upsert(candidate("sparse-cross-source-push"), fixture("sparse-cross-source-push").capture);
  assert.notEqual(sparseEmail.id, sparsePush.id);
  assert.deepEqual(sparsePush.relationships, [{
    kind: "possible_duplicate_of", targetId: sparseEmail.id,
    reasons: ["same_amount", "same_currency", "same_event_type", "same_normalized_merchant", "same_observed_timestamp"],
  }]);
  assert.equal(calculateDetectedMetrics(sparseStore.records()).byCurrency[0].detectedOutflowMinor, 1200);
});

test("a shared transaction reference evolves pending evidence into finalized evidence without overwriting a correction", () => {
  const store = new TransactionLifecycleStore();
  const pending = store.upsert(candidate("referenced-pending-usd"), fixture("referenced-pending-usd").capture);
  const reviewed = store.save(setUserOverrides(confirm(pending), { amountMinor: 1999, merchantLabel: "My Final Bowl" }));
  const finalized = store.upsert(candidate("referenced-finalized-usd"), fixture("referenced-finalized-usd").capture);
  assert.equal(reviewed.id, finalized.id);
  assert.equal(finalized.interpretation.settlementState, "finalized");
  assert.equal(finalized.interpretation.amountMinor, 2125);
  assert.equal(finalized.confirmationState, "needs_confirmation");
  assert.deepEqual(finalized.userOverrides, { amountMinor: 1999, merchantLabel: "My Final Bowl" });
  assert.equal(currencyMetrics(finalized, "USD").detectedOutflowMinor, 1999);
});

test("pending and finalized observations without a shared reference remain active, separate, and counted", () => {
  const store = new TransactionLifecycleStore();
  const pending = store.upsert(candidate("unlinked-pending-usd"), fixture("unlinked-pending-usd").capture);
  const finalized = store.upsert(candidate("unlinked-finalized-usd"), fixture("unlinked-finalized-usd").capture);
  assert.notEqual(pending.id, finalized.id);
  assert.equal(pending.interpretation.settlementState, "pending");
  assert.equal(finalized.interpretation.settlementState, "finalized");
  assert.equal(calculateDetectedMetrics(store.records()).byCurrency[0].detectedOutflowMinor, 2000);
});

test("replaying accepted fixtures leaves the unique event count and totals unchanged", () => {
  const store = new TransactionLifecycleStore();
  const ids = ["duplicate-source-original", "exact-cross-source-email", "exact-cross-source-push", "referenced-pending-usd", "referenced-finalized-usd"];
  for (const id of ids) store.upsert(candidate(id), fixture(id).capture);
  const first = calculateDetectedMetrics(store.records());
  for (const id of ids) store.upsert(candidate(id), fixture(id).capture);
  assert.deepEqual(calculateDetectedMetrics(store.records()), first);
  assert.equal(store.records().length, 3);
});
