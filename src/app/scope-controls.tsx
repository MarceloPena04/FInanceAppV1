"use client";

import { CalendarDays } from "lucide-react";
import { SourceSelector } from "./activity-controls";
import { useDemo } from "./demo-provider";

export function ScopeControls({ showWeek = true }: { showWeek?: boolean }) {
  const { activeScope, changeSource, sourceOptions, selectedWeek, setWeek, availableWeeks, loaded } = useDemo();
  return <fieldset className="page-scope-controls" disabled={!loaded} aria-label="View scope">
    <SourceSelector value={activeScope} onChange={changeSource} options={sourceOptions} />
    {showWeek && <label className="week-control"><CalendarDays size={14} /><span>Week of</span><select aria-label="Selected week" value={selectedWeek} onChange={event => setWeek(event.target.value)}>{availableWeeks.map(item => <option key={item} value={item}>{item}</option>)}</select></label>}
  </fieldset>;
}
