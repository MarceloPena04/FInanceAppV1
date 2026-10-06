"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { activityWeekLabel } from "../../domain/activity-grouping";
import { type ReportingEventEffect } from "../../domain/reporting-currency";
import { effectiveValues, type TransactionLifecycle } from "../../domain/transaction-lifecycle";
import { buildDailyFlow } from "../cash-flow-chart";
import { useDemo } from "../demo-provider";
import { humanDate, labels, money } from "../demo-utils";
import { ScopeControls } from "../scope-controls";
import "../support-pages.css";

function reasonText(effect: ReportingEventEffect, record: TransactionLifecycle) {
  if (effect.reason === "outside_week") return "Outside this UTC week or without a usable date. Zero effect this week.";
  if (effect.reason === "excluded") return record.deletionState === "active" ? "Excluded by you. Zero effect; open to restore." : "Removed from detected flow. Zero effect.";
  if (effect.reason === "duplicate") return "Linked as the same transaction. Its other notice carries the flow.";
  if (effect.reason === "missing_value") return "No usable amount or supported currency. Zero effect until corrected.";
  if (effect.reason === "neutral") return `${labels[effectiveValues(record).eventType] ?? "Neutral movement"} has zero effect on combined detected flow.`;
  if (effect.reason === "unclassified") return "Type not supplied. Amount stays unsigned and separate from inflow and outflow.";
  return record.confirmationState === "needs_confirmation" ? "Included in detected flow while awaiting your review. Confirmation adds no second amount." : "Included in detected flow and confirmed by you.";
}

export default function ReportsPage() {
  const { state, loaded, currency, selectedWeek, sourceLabel, scoped, allTime, weekly, openRecord } = useDemo();
  const [period, setPeriod] = useState<"week" | "all">("week");
  const days = buildDailyFlow(weekly, scoped, selectedWeek);
  const metrics = period === "week" ? weekly : allTime;
  const effects = metrics.effects.filter(effect => period === "all" || effect.reason !== "outside_week");
  const outside = weekly.effects.filter(effect => effect.reason === "outside_week").length;
  const recordsById = new Map(state.records.map(record => [record.id, record]));
  const zeroCount = metrics.effects.filter(effect => !effect.included && effect.reason !== "outside_week").length;

  return <div className="support-page">
    <ScopeControls />
    <section className="support-card" aria-labelledby="coverage-heading">
      <div className="section-heading"><div><h2 id="coverage-heading">What the figures cover</h2><p className="muted">Detected activity · {sourceLabel}</p></div><Link href="/" className="support-link">Overview<ChevronRight size={13} /></Link></div>
      <p className="support-copy">Detected net flow is inflow minus outflow. The selected UTC week is part of all-time history; these periods are never added together.</p>
      <table className="flow-table">
        <caption className="sr-only">Detected flow by period in {currency}</caption>
        <thead><tr><th scope="col">Detected flow</th><th scope="col">All-time history</th><th scope="col">Selected week</th></tr></thead>
        <tbody>
          <tr><th scope="row">Inflow</th><td>{money(allTime.inflowMinor, currency)}</td><td>{money(weekly.inflowMinor, currency)}</td></tr>
          <tr><th scope="row">Outflow</th><td>{money(allTime.outflowMinor, currency)}</td><td>{money(weekly.outflowMinor, currency)}</td></tr>
          <tr className="flow-table__net"><th scope="row">Net flow</th><td data-positive={allTime.netFlowMinor > 0}>{money(allTime.netFlowMinor, currency)}</td><td data-positive={weekly.netFlowMinor > 0}>{money(weekly.netFlowMinor, currency)}</td></tr>
          <tr><th scope="row">Unclassified, unsigned</th><td>{money(allTime.unclassifiedAmountMinor, currency)}</td><td>{money(weekly.unclassifiedAmountMinor, currency)}</td></tr>
        </tbody>
      </table>
      <p className="support-note">Unclassified amounts have zero net effect until a type is chosen. Transfers and withdrawals are neutral. Excluded and duplicate-suppressed records have zero effect.</p>
      <p className="support-note">{weekly.pendingCount} included {weekly.pendingCount === 1 ? "movement is" : "movements are"} awaiting review this week. Their {money(weekly.pendingAmountMinor, currency)} is already included; confirming them does not count it again.</p>
    </section>

    <section className="support-card" aria-labelledby="daily-heading">
      <div className="section-heading"><div><h2 id="daily-heading">Daily amounts</h2><p className="muted">{activityWeekLabel(selectedWeek)} · UTC calendar days</p></div></div>
      <table className="flow-table daily-flow-table">
        <caption className="sr-only">Daily detected inflow and outflow in {currency}</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Inflow</th><th scope="col">Outflow</th><th scope="col">Net flow</th></tr></thead>
        <tbody>{days.map(day => <tr key={day.key}><th scope="row">{day.label}<span>{day.key}</span></th><td>{money(day.income, currency)}</td><td>{money(day.spending, currency)}</td><td data-positive={day.income - day.spending > 0}>{money(day.income - day.spending, currency)}</td></tr>)}</tbody>
      </table>
      {!weekly.inflowMinor && !weekly.outflowMinor && <p className="support-note">No included inflow or outflow in this source and week. Neutral or unclassified activity can still appear below.</p>}
    </section>

    <section className="support-card" aria-labelledby="contributions-heading">
      <div className="section-heading"><div><h2 id="contributions-heading">How the totals are calculated</h2><p className="muted">Open a movement to inspect its notice, conversion, and corrections.</p></div><div className="period-switch" aria-label="Contribution period"><button aria-pressed={period === "week"} onClick={() => setPeriod("week")}>This week</button><button aria-pressed={period === "all"} onClick={() => setPeriod("all")}>All history</button></div></div>
      <p className="support-note">{effects.length} {effects.length === 1 ? "record" : "records"} in this view · {zeroCount} with zero net effect{period === "week" ? ` · ${outside} outside the week or without a usable date` : ""}.</p>
      <div className="report-contributions">{effects.map(effect => {
        const record = recordsById.get(effect.recordId);
        if (!record) return null;
        const value = effectiveValues(record);
        const amount = effect.inflowMinor ? `+${money(effect.inflowMinor, currency)}` : effect.outflowMinor ? `−${money(effect.outflowMinor, currency)}` : effect.unclassifiedAmountMinor ? `${money(effect.unclassifiedAmountMinor, currency)} unsigned` : money(0, currency);
        return <button key={record.id} disabled={!loaded} className="report-contribution" data-record-id={record.id} onClick={event => openRecord(record.id, event.currentTarget)}>
          <span><b>{value.merchantText ?? "Unlabelled activity"}</b><small>{humanDate(record)} · {labels[value.eventType] ?? value.eventType}</small><span>{reasonText(effect, record)}</span></span>
          <strong data-positive={effect.inflowMinor > 0}>{amount}<ChevronRight size={13} aria-hidden="true" /></strong>
        </button>;
      })}</div>
      {!effects.length && <div className="support-empty"><p>No records in this period and source.</p><span>Choose another week, source, or All history to inspect existing activity.</span></div>}
      {period === "week" && outside > 0 && <button className="support-link" onClick={() => setPeriod("all")}>Inspect {outside} records outside this week<ChevronRight size={13} /></button>}
      <p className="support-note">Amounts are converted to your selected display currency. Original source currency and locked assumptions stay intact.</p>
    </section>
  </div>;
}
