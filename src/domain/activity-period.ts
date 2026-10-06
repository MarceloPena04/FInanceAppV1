import { groupingDate, type TransactionLifecycle } from "./transaction-lifecycle.ts";

export interface ActivityDateRange { start: string; end: string }

function dateInstant(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const instant = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value ? instant : undefined;
}

export function dateRangeError({ start, end }: ActivityDateRange): string | undefined {
  if (!start) return "Choose a start date.";
  if (!end) return "Choose an end date.";
  const first = dateInstant(start), last = dateInstant(end);
  if (first === undefined || last === undefined) return "Choose valid start and end dates.";
  if (last < first) return "End date must be on or after start date.";
}

export function weekDateRange(week: string): ActivityDateRange {
  const end = new Date(`${week}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: week, end: end.toISOString().slice(0, 10) };
}

/** Both dates are inclusive UTC calendar days, using the same corrected/fallback date as the activity list. */
export function filterActivityByDateRange(records: TransactionLifecycle[], range: ActivityDateRange): TransactionLifecycle[] {
  if (dateRangeError(range)) return [];
  const first = dateInstant(range.start)!, afterLast = dateInstant(range.end)! + 86400000;
  return records.filter(record => {
    const value = groupingDate(record).value;
    if (!value) return false;
    const instant = new Date(value.length === 10 ? `${value}T00:00:00Z` : value).getTime();
    return Number.isFinite(instant) && instant >= first && instant < afterLast;
  });
}

export function activityRangeLabel(range: ActivityDateRange): string {
  const format = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const first = format.format(new Date(`${range.start}T00:00:00Z`));
  return range.start === range.end ? first : `${first} – ${format.format(new Date(`${range.end}T00:00:00Z`))}`;
}
