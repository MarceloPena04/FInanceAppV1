"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronRight } from "lucide-react";
import { activityWeekLabel } from "../domain/activity-grouping";
import { SourceSelector } from "./activity-controls";
import { CashFlowChart } from "./cash-flow-chart";
import { useDemo } from "./demo-provider";
import { money } from "./demo-utils";

export default function Home() {
  const { activeScope, changeSource, sourceOptions, sourceLabel, allTime, weekly, currency, selectedWeek, setWeek, availableWeeks, scoped, loaded } = useDemo();
  return <section className="overview-card" aria-labelledby="flow-heading">
    <div className="overview-top">
      <div className="overview-total">
        <div className="overview-source"><p id="flow-heading" className="eyebrow">Detected net flow</p><fieldset disabled={!loaded}><SourceSelector value={activeScope} onChange={changeSource} options={sourceOptions} /></fieldset></div>
        <p className="hero-amount" data-positive={allTime.netFlowMinor > 0}>{money(allTime.netFlowMinor, currency)}</p>
        <p className="muted">All-time history · {sourceLabel}</p>
      </div>
      <div className="overview-tiles">
        <div className="metric-tile metric-tile--income"><p className="eyebrow">Weekly inflow</p><p>{money(weekly.inflowMinor, currency)}</p><span className="metric-direction" aria-hidden="true"><ArrowUpRight size={12} /></span></div>
        <div className="metric-tile metric-tile--expense"><p className="eyebrow">Weekly outflow</p><p>{money(weekly.outflowMinor, currency)}</p><span className="metric-direction" aria-hidden="true"><ArrowDownLeft size={12} /></span></div>
      </div>
    </div>
    <div className="weekly-header"><div><h2>Cash flow</h2><p className="muted">{activityWeekLabel(selectedWeek)}</p></div><div className="weekly-controls"><p className="weekly-net" data-positive={weekly.netFlowMinor > 0}>{money(weekly.netFlowMinor, currency)} <span>net</span></p><label className="week-control"><CalendarDays size={14} /><span>Week of</span><select aria-label="Selected week" value={selectedWeek} disabled={!loaded} onChange={event => setWeek(event.target.value)}>{availableWeeks.map(item => <option key={item} value={item}>{item}</option>)}</select></label></div></div>
    <CashFlowChart metrics={weekly} records={scoped} week={selectedWeek} currency={currency} />
    <div className="overview-footnote"><Link href="/reports">Flow details<ChevronRight size={12} /></Link></div>
  </section>;
}
