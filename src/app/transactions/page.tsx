"use client";

import { useState } from "react";
import { activityRangeLabel, filterActivityByDateRange, weekDateRange, type ActivityDateRange } from "../../domain/activity-period";
import { calculateReportingMetrics } from "../../domain/reporting-currency";
import { newestFirst, visibleActivity } from "../../domain/review-queue";
import { filterActivityRecords, type ActivityTypeFilter } from "../../domain/wallet-source";
import { ActivityControls } from "../activity-controls";
import { ActivityList } from "../activity-list";
import { useDemo } from "../demo-provider";
import { money } from "../demo-utils";
import { ScopeControls } from "../scope-controls";
import { TransactionPeriodPicker } from "../transaction-period-picker";
import "../activity-pages.css";

export default function TransactionsPage() {
  const { state, loaded, currency, scoped, selectedWeek, setWeek, availableWeeks, sourceLabel, openRecord } = useDemo();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ActivityTypeFilter>("all");
  const [customRange, setCustomRange] = useState<ActivityDateRange>();
  const range = customRange ?? weekDateRange(selectedWeek);
  const sourceRecords = newestFirst(visibleActivity(scoped));
  const periodRecords = filterActivityByDateRange(sourceRecords, range);
  const records = filterActivityRecords(periodRecords, search, type, "all");
  const metrics = calculateReportingMetrics(filterActivityByDateRange(scoped, range), currency);

  return <section className="activity-panel transactions-panel" aria-labelledby="activity-heading">
    <div className="section-heading">
      <div><h2 id="activity-heading" tabIndex={-1}>Your activity</h2><p className="muted">{activityRangeLabel(range)} · {sourceLabel}</p></div>
      <div className="transaction-counts" role="status" aria-live="polite" aria-atomic="true">
        <p className="count-pill">{records.length} of {sourceRecords.length} {sourceRecords.length === 1 ? "event" : "events"} shown</p>
        <p className="transaction-counts__week"><b>{periodRecords.length}</b> in {customRange ? "selected dates" : "selected week"} · {sourceRecords.length} total across all weeks</p>
      </div>
    </div>
    <div className="transactions-toolbar">
      <div className="transactions-toolbar__scope"><div className="transactions-period-controls"><ScopeControls showWeek={false} /><TransactionPeriodPicker range={range} custom={!!customRange} week={selectedWeek} weeks={availableWeeks} disabled={!loaded} onWeek={week => { setWeek(week); setCustomRange(undefined); }} onRange={setCustomRange} /></div><p className="transactions-toolbar__net"><span>{customRange ? "Selected dates net" : "Selected week net"}</span><b data-positive={metrics.netFlowMinor >= 0}>{money(metrics.netFlowMinor, currency)}</b></p></div>
      <ActivityControls search={search} onSearch={setSearch} type={type} onType={setType} />
    </div>
    <p className="filter-explanation">Showing only {customRange ? "your selected dates" : "the selected week"}. Search and type narrow the list; net flow covers the full selected period.</p>
    {!loaded && <p className="route-loading" role="status">Loading your workspace…</p>}
    <ActivityList records={records} allRecords={state.records} currency={currency} onOpen={openRecord} />
  </section>;
}
