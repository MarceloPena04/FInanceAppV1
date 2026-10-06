import { calculateReportingMetrics, type ReportingCurrency } from "../domain/reporting-currency";
import { groupingDate, type TransactionLifecycle } from "../domain/transaction-lifecycle";
import { activityWeekLabel } from "../domain/activity-grouping";
import { money } from "./demo-utils";

type Metrics = ReturnType<typeof calculateReportingMetrics>;
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function buildDailyFlow(metrics: Metrics, records: TransactionLifecycle[], week: string) {
  return dayNames.map((label, index) => {
    const date = new Date(`${week}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const ids = new Set(records.filter(record => {
      const value = groupingDate(record).value;
      if (!value) return false;
      const instant = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
      return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === key;
    }).map(record => record.id));
    const effects = metrics.effects.filter(effect => ids.has(effect.recordId));
    return { label, key, income: effects.reduce((sum, effect) => sum + effect.inflowMinor, 0), spending: effects.reduce((sum, effect) => sum + effect.outflowMinor, 0) };
  });
}

export function CashFlowChart({ metrics, records, week, currency }: { metrics: Metrics; records: TransactionLifecycle[]; week: string; currency: ReportingCurrency }) {
  const days = buildDailyFlow(metrics, records, week);
  const max = Math.max(1, ...days.flatMap(day => [day.income, day.spending]));
  return <div className="cash-chart">
    <div className="cash-chart__legend"><span><i className="legend-dot legend-dot--income" />Inflow</span><span><i className="legend-dot legend-dot--expense" />Outflow</span><span className="cash-chart__basis">UTC calendar days</span></div>
    <div className="cash-chart__bars" role="img" aria-label={`Daily detected flow for ${activityWeekLabel(week)}. Total inflow ${money(metrics.inflowMinor, currency)}, outflow ${money(metrics.outflowMinor, currency)}.`}>
      {days.map(day => <div key={day.key} className="cash-chart__day" title={`${day.label}, ${day.key}: ${money(day.income, currency)} inflow, ${money(day.spending, currency)} outflow`}>
        <div className="cash-chart__pair"><div className="cash-chart__bar cash-chart__bar--income" style={{ height: `${day.income / max * 100}%` }} /><div className="cash-chart__bar cash-chart__bar--expense" style={{ height: `${day.spending / max * 100}%` }} /></div><span>{day.label}</span>
      </div>)}
    </div>
  </div>;
}
