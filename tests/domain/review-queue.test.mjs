import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefaultFixtureDocument } from '../../src/fixtures/loader.ts';
import { EMPTY_SCENARIO, duplicateDecision, processCapture } from '../../src/domain/fictional-scenario.ts';
import { calculateReportingMetrics } from '../../src/domain/reporting-currency.ts';
import { confirmReady, linkedEvidence, reviewQueue, visibleActivity } from '../../src/domain/review-queue.ts';

const fixtures = loadDefaultFixtureDocument().records;
const add = (state, id) => { const fixture = fixtures.find(item => item.id === id); assert.ok(fixture); return processCapture(state, id, fixture.capture); };
const make = ids => ids.reduce(add, { ...EMPTY_SCENARIO, defaultCurrency: 'EUR' });
const stateFor = (state, id) => state.records.find(item => item.sourceCandidates.some(candidate => candidate.captureId === fixtures.find(fixture => fixture.id === id).capture.captureId));

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

test('week and history pending money partition shared reporting totals', () => {
  const state = make(['normal-purchase-email-eur', 'refund-eur', 'referenced-pending-usd', 'transfer-eur', 'sparse-cross-source-email', 'sparse-cross-source-push']);
  const queue = reviewQueue(state, 'EUR', '2026-09-28');
  const all = calculateReportingMetrics(state.records, 'EUR');
  assert.equal(queue.week.amountMinor + queue.elsewhere.amountMinor, all.pendingAmountMinor);
  assert.equal(queue.week.count + queue.elsewhere.count, all.pendingCount);
  assert.equal(queue.total.amountMinor, all.pendingAmountMinor);
  assert.equal(queue.readyWeekAmountMinor + queue.readyElsewhereAmountMinor, queue.readyAmountMinor);
  assert.equal(queue.total.amountMinor, calculateReportingMetrics(state.records, 'EUR').pendingAmountMinor);
  assert.equal(queue.needsAttention.find(item => item.id === stateFor(state, 'transfer-eur').id) !== undefined, true);
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
  assert.equal(stateFor(state, 'sparse-cross-source-email').confirmationState, 'needs_confirmation');
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').ready.length, 1);
  const refreshed = structuredClone(state);
  state = add(add(refreshed, 'sparse-cross-source-email'), 'sparse-cross-source-push');
  assert.equal(visibleActivity(state.records).length, 1);
  assert.equal(linkedEvidence(target, state.records).length, 2);
  state = confirmReady(state, 'EUR', '2026-09-28');
  assert.equal(state.records.find(item => item.id === target.id).confirmationState, 'confirmed');
  state = duplicateDecision(state, duplicate.id, 'undo');
  assert.equal(visibleActivity(state.records).length, 2);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 1200);
  state = duplicateDecision(state, duplicate.id, 'separate');
  assert.equal(visibleActivity(state.records).length, 2);
  assert.equal(calculateReportingMetrics(state.records, 'EUR').outflowMinor, 1200);
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').ready.length, 1);
  state = duplicateDecision(state, duplicate.id, 'undo');
  assert.equal(reviewQueue(state, 'EUR', '2026-09-28').needsAttention.some(item => item.id === duplicate.id), true);
});
