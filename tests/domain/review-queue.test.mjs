import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefaultFixtureDocument } from '../../src/fixtures/loader.ts';
import { EMPTY_SCENARIO, duplicateDecision, processCapture, confirmRecord, changeRecord, weeks } from '../../src/domain/fictional-scenario.ts';
import { calculateReportingMetrics } from '../../src/domain/reporting-currency.ts';
import { confirmReady, linkedEvidence, newestFirst, reviewQueue, visibleActivity } from '../../src/domain/review-queue.ts';

const fixtures = loadDefaultFixtureDocument().records;
const add = (state, id) => { const fixture = fixtures.find(item => item.id === id); assert.ok(fixture); return processCapture(state, id, fixture.capture); };
const make = ids => ids.reduce(add, { ...EMPTY_SCENARIO, defaultCurrency: 'EUR' });
const stateFor = (state, id) => state.records.find(item => item.sourceCandidates.some(candidate => candidate.captureId === fixtures.find(fixture => fixture.id === id).capture.captureId));

test('invalid dates stay out of selectable weeks and sort with undated activity', () => {
  const state = make(['normal-purchase-email-eur', 'refund-eur']);
  const invalid = structuredClone(state.records[0]);
  invalid.id = 'invalid-date';
  invalid.userOverrides = { ...invalid.userOverrides, occurredAt: 'not-a-date' };
  invalid.interpretation = { ...invalid.interpretation, occurredAt: undefined };
  invalid.sourceCandidates = invalid.sourceCandidates.map(candidate => ({ ...candidate, capturedAt: undefined, processedAt: undefined, sourceFacts: { ...candidate.sourceFacts, occurredAt: undefined } }));
  assert.deepEqual(weeks([...state.records, invalid]), ['2026-09-21']);
  assert.equal(newestFirst([...state.records, invalid]).at(-1).id, 'invalid-date');
});

test('ready bulk actions leave attention untouched and write one action per confirmation', () => {
  const original = make(['normal-purchase-email-eur', 'refund-eur', 'missing-merchant', 'transfer-eur', 'sparse-cross-source-email', 'sparse-cross-source-push']);
  const queue = reviewQueue(original, 'EUR', '2026-09-28');
  assert.equal(queue.ready.length, 2);
  assert.ok(queue.needsAttention.some(item => item.id === stateFor(original, 'missing-merchant').id));
  assert.ok(queue.needsAttention.some(item => item.id === stateFor(original, 'transfer-eur').id));
  assert.ok(queue.needsAttention.some(item => item.id === stateFor(original, 'sparse-cross-source-email').id));
  const one = confirmReady(original, 'EUR', '2026-09-28', [queue.ready[0].id, stateFor(original, 'missing-merchant').id]);
  assert.equal(one.records.find(item => item.id === queue.ready[0].id).confirmationState, 'confirmed');
  assert.equal(one.records.find(item => item.id === queue.ready[1].id).confirmationState, 'needs_confirmation');
  assert.equal(stateFor(one, 'missing-merchant').confirmationState, 'needs_confirmation');
  const all = confirmReady(original, 'EUR', '2026-09-28');
  for (const ready of queue.ready) {
    const after = all.records.find(item => item.id === ready.id);
    assert.equal(after.confirmationState, 'confirmed');
    assert.equal(after.actionHistory.at(-1).kind, 'confirmed');
  }
  for (const attention of queue.needsAttention) assert.equal(all.records.find(item => item.id === attention.id).confirmationState, 'needs_confirmation');
});

test('review counts and signed effects reconcile by period', () => {
  const state = make(['normal-purchase-email-eur', 'refund-eur', 'referenced-pending-usd', 'transfer-eur', 'sparse-cross-source-email', 'sparse-cross-source-push', 'missing-merchant']);
  const queue = reviewQueue(state, 'EUR', '2026-09-28');
  assert.equal(queue.week.count + queue.elsewhere.count, queue.total.count);
  for (const field of ['inflowMinor', 'outflowMinor', 'unclassifiedMinor', 'zeroCount']) assert.equal(queue.week[field] + queue.elsewhere[field], queue.total[field]);
  assert.equal(queue.total.count, queue.ready.length + queue.needsAttention.length);
  assert.equal(queue.total.inflowMinor, 1840);
  assert.equal(queue.total.unclassifiedMinor, 782);
});

test('all-time review retains zero-effect and date-less pending records', () => {
  const original = make(['normal-purchase-email-eur', 'transfer-eur']);
  const transfer = stateFor(original, 'transfer-eur');
  const state = {
    ...original,
    records: original.records.map(record => record.id === transfer.id ? {
      ...record,
      interpretation: { ...record.interpretation, occurredAt: undefined },
      userOverrides: { ...record.userOverrides, occurredAt: undefined },
      sourceCandidates: record.sourceCandidates.map(candidate => ({
        ...candidate,
        capturedAt: undefined,
        processedAt: undefined,
        sourceFacts: { ...candidate.sourceFacts, occurredAt: undefined },
      })),
    } : record),
  };
  const queue = reviewQueue(state, 'EUR', '2026-09-21');

  assert.equal(queue.week.count, 1, 'a record without any usable date cannot be assigned to This week');
  assert.equal(queue.total.count, 2, 'all-time review still includes every pending record');
  assert.equal(queue.total.zeroCount, 1, 'a neutral transfer is pending work even though it has no signed money effect');
  assert.ok(queue.total.count > 0, 'the review-card visibility condition remains true while pending work exists');
});

test('duplicate choices change visible cards and money, retain evidence, and survive replay', () => {
  let state = make(['sparse-cross-source-email', 'sparse-cross-source-push']);
  const duplicate = stateFor(state, 'sparse-cross-source-push');
  const target = state.records.find(item => item.id === duplicate.relationships[0].targetId);
  assert.equal(visibleActivity(state.records).length, 2);
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').needsAttention.length, 2);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 1200);
  state = duplicateDecision(state, duplicate.id, 'same');
  assert.deepEqual(visibleActivity(state.records).map(item => item.id), [target.id]);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 600);
  assert.equal(linkedEvidence(target, state.records).length, 2);
  assert.equal(stateFor(state, 'sparse-cross-source-email').confirmationState, 'confirmed');
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').ready.length, 0);
  const refreshed = structuredClone(state);
  state = add(add(refreshed, 'sparse-cross-source-email'), 'sparse-cross-source-push');
  assert.equal(visibleActivity(state.records).length, 1);
  assert.equal(linkedEvidence(target, state.records).length, 2);
  state = duplicateDecision(state, duplicate.id, 'undo');
  assert.equal(visibleActivity(state.records).length, 2);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 1200);
  state = duplicateDecision(state, duplicate.id, 'separate');
  assert.equal(visibleActivity(state.records).length, 2);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 1200);
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').ready.length, 0);
  state = duplicateDecision(state, duplicate.id, 'undo');
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').needsAttention.some(item => item.id === duplicate.id), true);
});

test('unknown money stays unsigned through confirmation paths and follows each explicit choice', () => {
  const original = make(['missing-merchant']);
  const id = stateFor(original, 'missing-merchant').id;
  const before = calculateReportingMetrics(original.records, 'EUR');
  assert.equal(before.netFlowMinor, 0);
  assert.equal(before.unclassifiedAmountMinor, 782);
  assert.equal(confirmRecord(original, id).records[0].confirmationState, 'needs_confirmation');
  assert.equal(confirmReady(original, 'EUR', '2026-09-21').records[0].confirmationState, 'needs_confirmation');
  for (const [kind, expected] of [['generic_expense', -782], ['income', 782], ['transfer', 0]]) {
    let state = changeRecord(original, id, 'edited', `Choose ${kind}`, record => ({ ...record, userOverrides: { ...record.userOverrides, eventType: kind } }));
    assert.equal(calculateReportingMetrics(state.records, 'EUR').netFlowMinor, expected);
    state = confirmRecord(state, id);
    assert.equal(state.records[0].confirmationState, 'confirmed');
    assert.equal(calculateReportingMetrics(state.records, 'EUR').netFlowMinor, expected);
    assert.equal(state.records[0].sourceCandidates[0].sourceFacts.kind, 'unknown');
  }
});

test('duplicate resolution confirms complete notices and undo preserves earlier independent confirmation', () => {
  let state = make(['sparse-cross-source-email', 'sparse-cross-source-push']);
  const child = stateFor(state, 'sparse-cross-source-push');
  const targetId = child.relationships[0].targetId;
  state = confirmRecord(state, targetId);
  state = duplicateDecision(state, child.id, 'same');
  assert.equal(state.records.find(item => item.id === targetId).confirmationState, 'confirmed');
  assert.equal(state.records.find(item => item.id === child.id).confirmationState, 'needs_confirmation');
  state = add(structuredClone(state), 'sparse-cross-source-push');
  assert.equal(visibleActivity(state.records).length, 1);
  state = duplicateDecision(state, child.id, 'undo');
  assert.equal(state.records.find(item => item.id === targetId).confirmationState, 'confirmed');
  assert.equal(state.records.find(item => item.id === child.id).confirmationState, 'needs_confirmation');
  state = duplicateDecision(state, child.id, 'separate');
  assert.equal(state.records.find(item => item.id === child.id).confirmationState, 'confirmed');
  state = duplicateDecision(state, child.id, 'undo');
  assert.equal(state.records.find(item => item.id === child.id).confirmationState, 'needs_confirmation');
});
