import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefaultFixtureDocument } from '../../src/fixtures/loader.ts';
import { EMPTY_SCENARIO, processCapture } from '../../src/domain/fictional-scenario.ts';
import { dateRangeError, filterActivityByDateRange, weekDateRange } from '../../src/domain/activity-period.ts';

const fixture = loadDefaultFixtureDocument().records.find(item => item.id === 'normal-purchase-email-eur');
assert.ok(fixture);
const base = processCapture(EMPTY_SCENARIO, fixture.id, fixture.capture).records[0];
const dated = (id, occurredAt) => ({ ...base, id, userOverrides: { occurredAt } });
const ids = (records, range) => filterActivityByDateRange(records, range).map(record => record.id);

test('a selected week includes both boundary days and excludes adjacent weeks', () => {
  const records = [dated('before', '2026-09-27T23:59:59Z'), dated('first', '2026-09-28T00:00:00Z'), dated('last', '2026-10-04T23:59:59Z'), dated('after', '2026-10-05T00:00:00Z')];
  assert.deepEqual(ids(records, weekDateRange('2026-09-28')), ['first', 'last']);
  assert.deepEqual(weekDateRange('2026-12-28'), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(weekDateRange('2024-02-26'), { start: '2024-02-26', end: '2024-03-03' });
});

test('same-day ranges use UTC days even when event timestamps have offsets', () => {
  const records = [dated('start', '2026-09-30'), dated('offset-in', '2026-09-29T23:30:00-02:00'), dated('offset-back', '2026-10-01T00:30:00+03:00'), dated('next-day', '2026-09-30T23:30:00-02:00')];
  assert.deepEqual(ids(records, { start: '2026-09-30', end: '2026-09-30' }), ['start', 'offset-in', 'offset-back']);
});

test('range filtering follows corrected dates and capture/processing fallbacks', () => {
  const undated = { ...base, interpretation: { ...base.interpretation, occurredAt: undefined }, sourceCandidates: base.sourceCandidates.map(candidate => ({ ...candidate, capturedAt: undefined, processedAt: undefined })) };
  const captured = { ...undated, id: 'captured', sourceCandidates: undated.sourceCandidates.map(candidate => ({ ...candidate, capturedAt: '2026-09-30T12:00:00Z' })) };
  const processed = { ...undated, id: 'processed', sourceCandidates: undated.sourceCandidates.map(candidate => ({ ...candidate, processedAt: '2026-09-30T15:00:00Z' })) };
  assert.deepEqual(ids([dated('corrected', '2026-09-30'), captured, processed, { ...undated, id: 'missing' }, dated('invalid', 'invalid')], { start: '2026-09-30', end: '2026-09-30' }), ['corrected', 'captured', 'processed']);
});

test('invalid or reversed ranges cannot return a misleading list', () => {
  for (const range of [{ start: '', end: '' }, { start: '2026-10-02', end: '2026-10-01' }, { start: '2026-02-29', end: '2026-03-01' }, { start: '2026-09-30', end: '2026-09-31' }]) {
    assert.ok(dateRangeError(range));
    assert.deepEqual(ids([dated('event', '2026-09-30')], range), []);
  }
  assert.equal(dateRangeError({ start: '2024-02-29', end: '2024-02-29' }), undefined);
});
