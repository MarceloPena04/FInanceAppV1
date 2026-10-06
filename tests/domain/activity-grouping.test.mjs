import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefaultFixtureDocument } from '../../src/fixtures/loader.ts';
import { EMPTY_SCENARIO, processCapture } from '../../src/domain/fictional-scenario.ts';
import { activityDayLabel, activityWeekLabel, groupActivityByWeekAndDay } from '../../src/domain/activity-grouping.ts';
import { newestFirst } from '../../src/domain/review-queue.ts';
import { filterActivityRecords } from '../../src/domain/wallet-source.ts';

const fixture = loadDefaultFixtureDocument().records.find(item => item.id === 'normal-purchase-email-eur');
assert.ok(fixture);
const base = processCapture(EMPTY_SCENARIO, fixture.id, fixture.capture).records[0];
const dated = (id, occurredAt) => ({ ...base, id, userOverrides: { ...base.userOverrides, occurredAt } });

test('activity groups newest first by UTC week and day, including a corrected date and an unavailable date', () => {
  const records = [
    dated('sunday', '2026-10-04T23:30:00Z'),
    dated('monday', '2026-10-05T00:30:00Z'),
    dated('corrected', '2026-09-30'),
    dated('same-day', '2026-09-30T08:00:00Z'),
    {
      ...base, id: 'undated', interpretation: { ...base.interpretation, occurredAt: undefined },
      sourceCandidates: base.sourceCandidates.map(candidate => ({ ...candidate, capturedAt: undefined, processedAt: undefined })),
    },
  ];
  const groups = groupActivityByWeekAndDay(newestFirst(records));
  assert.deepEqual(groups.map(group => group.week), ['2026-10-05', '2026-09-28', 'unknown']);
  assert.deepEqual(groups[1].days.map(day => day.day), ['2026-10-04', '2026-09-30']);
  assert.deepEqual(groups[1].days[1].records.map(record => record.id), ['same-day', 'corrected']);
  assert.equal(groups[2].days[0].day, 'unknown');
  assert.equal(activityWeekLabel('2026-09-28'), 'Week of Sep 28, 2026');
  assert.equal(activityDayLabel('2026-09-30'), 'Wednesday, Sep 30');
  assert.equal(activityWeekLabel('unknown'), 'Date unavailable');
});

test('search and type filters leave only headings with visible records', () => {
  const records = newestFirst([dated('expense-day', '2026-09-30'), { ...dated('income-day', '2026-09-29'), userOverrides: { ...base.userOverrides, occurredAt: '2026-09-29', eventType: 'income' } }]);
  const filtered = filterActivityRecords(records, '', 'income', 'all');
  const groups = groupActivityByWeekAndDay(filtered);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].days.map(day => day.day), ['2026-09-29']);
  assert.deepEqual(groups[0].days[0].records.map(record => record.id), ['income-day']);
});
