import assert from "node:assert/strict";
import test from "node:test";

import { loadDefaultFixtureDocument } from "../../src/fixtures/loader.ts";
import { EMPTY_SCENARIO, changeRecord, confirmRecord, processCapture } from "../../src/domain/fictional-scenario.ts";
import { clearUserOverrides, effectiveValues, groupingDate } from "../../src/domain/transaction-lifecycle.ts";
import { calculateReportingMetrics, reportingEventEffect } from "../../src/domain/reporting-currency.ts";
import { attentionReasons, reviewQueue } from "../../src/domain/review-queue.ts";

const fixtures = loadDefaultFixtureDocument().records;
const fixture = (id) => {
  const found = fixtures.find((item) => item.id === id);
  assert.ok(found, `${id} fixture should exist`);
  return found;
};
const add = (state, id) => processCapture(state, id, fixture(id).capture);
const recordFor = (state, id) => state.records.find((record) => record.sourceCandidates.some((candidate) => candidate.captureId === fixture(id).capture.captureId));

test("Example Cafe receives one locked reporting-default currency assumption while source currency stays absent", () => {
  const state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "payment-without-currency");
  const record = recordFor(state, "payment-without-currency");
  assert.ok(record);
  assert.equal(record.sourceCandidates[0].sourceFacts.currency, undefined);
  assert.deepEqual(record.currencyAssumption, { currency: "EUR", basis: "chosen_app_default" });

  const value = effectiveValues(record);
  assert.equal(value.currency, "EUR");
  assert.equal(value.currencyBasis, "assumed_default");
  assert.equal(value.eventType, "purchase");
  assert.equal(reportingEventEffect(record, "EUR").outflowMinor, 1750);
  assert.ok(attentionReasons(record, state.records).some((reason) => /currency assumed/i.test(reason)));
  assert.ok(reviewQueue(state, "EUR", "2026-09-01").needsAttention.some((item) => item.id === record.id));

  const usd = reportingEventEffect(record, "USD");
  assert.equal(usd.conversion?.sourceCurrency, "EUR", "the original assumption is the conversion source");
  assert.equal(usd.outflowMinor, 1902, "changing the reporting display never reinterprets 17.50 as USD");
});

test("a later explicit source currency reopens a confirmed assumed record while holding its locked effect for review", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "payment-without-currency");
  const original = recordFor(state, "payment-without-currency");
  state = confirmRecord(state, original.id);
  assert.equal(recordFor(state, "payment-without-currency").confirmationState, "confirmed");

  state = processCapture(state, "payment-without-currency-explicit-usd", {
    ...fixture("payment-without-currency").capture,
    captureId: "capture-028-explicit-usd",
    rawText: "Payment completed: USD 17.50 at Example Cafe.",
  });

  const changed = recordFor(state, "payment-without-currency");
  assert.equal(changed.confirmationState, "needs_confirmation");
  assert.match(changed.evidenceConflict ?? "", /currency/i);
  assert.equal(changed.sourceCandidates[0].sourceFacts.currency, undefined);
  assert.equal(changed.sourceCandidates.at(-1).sourceFacts.currency, "USD");
  assert.equal(effectiveValues(changed).currency, "EUR", "the accepted assumption remains effective until the person reviews new evidence");
  assert.equal(reportingEventEffect(changed, "EUR").outflowMinor, 1750);
});

test("a corrected date is date-only, moves weekly reporting, and undo restores source date and timestamp evidence", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "normal-purchase-email-eur");
  const id = recordFor(state, "normal-purchase-email-eur").id;
  assert.equal(calculateReportingMetrics(state.records, "EUR", "2026-09-21").outflowMinor, 1299);

  state = changeRecord(state, id, "edited", "Person corrected date", (record) => ({
    ...record,
    userOverrides: { ...record.userOverrides, occurredAt: "2026-09-30" },
  }));
  let corrected = recordFor(state, "normal-purchase-email-eur");
  assert.equal(effectiveValues(corrected).occurredAt, "2026-09-30");
  assert.equal(effectiveValues(corrected).occurredAtBasis, "user_corrected_date");
  assert.deepEqual(groupingDate(corrected), { value: "2026-09-30", basis: "user_corrected_date" });
  assert.equal(calculateReportingMetrics(state.records, "EUR", "2026-09-21").outflowMinor, 0);
  assert.equal(calculateReportingMetrics(state.records, "EUR", "2026-09-28").outflowMinor, 1299);
  assert.equal(corrected.sourceCandidates[0].sourceFacts.occurredAt, "2026-09-27");
  assert.equal(corrected.sourceCandidates[0].capturedAt, "2026-09-28T08:42:00Z");

  state = changeRecord(state, id, "edited", "Undo occurredAt", (record) => clearUserOverrides(record, ["occurredAt"]));
  corrected = recordFor(state, "normal-purchase-email-eur");
  assert.equal(effectiveValues(corrected).occurredAt, "2026-09-27");
  assert.equal(effectiveValues(corrected).occurredAtBasis, "source_event_date");
  assert.deepEqual(groupingDate(corrected), { value: "2026-09-27", basis: "source_event_date" });
  assert.equal(calculateReportingMetrics(state.records, "EUR", "2026-09-21").outflowMinor, 1299);
});

test("an unrelated correction preserves source currency provenance and does not create a currency decision", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "normal-purchase-email-eur");
  const id = recordFor(state, "normal-purchase-email-eur").id;
  state = changeRecord(state, id, "edited", "Person corrected title", (record) => ({
    ...record,
    userOverrides: { ...record.userOverrides, merchantLabel: "Morning coffee" },
  }));

  const record = recordFor(state, "normal-purchase-email-eur");
  assert.equal(record.sourceCandidates[0].sourceFacts.currency, "EUR");
  assert.equal(record.userOverrides.currency, undefined);
  assert.equal(effectiveValues(record).currencyBasis, "source");
  assert.equal(attentionReasons(record, state.records).includes("missing_currency"), false);
  assert.equal(attentionReasons(record, state.records).includes("assumed_currency"), false);
});
