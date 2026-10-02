import { groupingDate, type TransactionLifecycle } from "./transaction-lifecycle.ts";

export interface ActivityDay {
  day: string;
  records: TransactionLifecycle[];
}

export interface ActivityWeek {
  week: string;
  days: ActivityDay[];
}

function utcDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

/** Input is already newest first. Date-only values and timestamps share a UTC calendar day. */
export function groupActivityByWeekAndDay(records: TransactionLifecycle[]): ActivityWeek[] {
  const weeks = new Map<string, Map<string, TransactionLifecycle[]>>();
  for (const record of records) {
    const date = utcDate(groupingDate(record).value);
    const day = date?.toISOString().slice(0, 10) ?? "unknown";
    const monday = date && new Date(date.getTime());
    if (monday) monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const week = monday?.toISOString().slice(0, 10) ?? "unknown";
    if (!weeks.has(week)) weeks.set(week, new Map());
    const days = weeks.get(week)!;
    days.set(day, [...(days.get(day) ?? []), record]);
  }
  return [...weeks].map(([week, days]) => ({
    week,
    days: [...days].map(([day, dayRecords]) => ({ day, records: dayRecords })),
  }));
}

export function activityWeekLabel(week: string): string {
  if (week === "unknown") return "Date unavailable";
  return `Week of ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${week}T00:00:00Z`))}`;
}

export function activityDayLabel(day: string): string {
  if (day === "unknown") return "Date unavailable";
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}
