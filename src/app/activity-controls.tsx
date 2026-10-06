"use client";

import { Search } from "lucide-react";
import { useId } from "react";
import type { ActivityTypeFilter, SourceScopeOption } from "../domain/wallet-source";

export interface ActivityControlsProps {
  search: string;
  onSearch: (value: string) => void;
  type: ActivityTypeFilter;
  onType: (value: ActivityTypeFilter) => void;
  compact?: boolean;
}

export interface SourceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: SourceScopeOption[];
  compact?: boolean;
}

export function SourceSelector({ value, onChange, options, compact = false }: SourceSelectorProps) {
  const id = useId();
  const groups = [
    { key: "bank", label: "Banks" },
    { key: "account", label: "Accounts and cards" },
    { key: "assigned", label: "Assigned by you" },
  ] as const;
  return <div className={`source-selector ${compact ? "source-selector--compact" : ""}`}>
    <label htmlFor={id} className={compact ? "sr-only" : "source-selector__caption"}>Viewing source</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} className="source-selector__select">
      <option value="all">All sources</option>
      {groups.map(group => {
        const members = options.filter(option => option.group === group.key);
        return members.length ? <optgroup key={group.key} label={group.label}>{members.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</optgroup> : null;
      })}
      <option value="unassigned">Source not identified</option>
    </select>
  </div>;
}

export function ActivityControls({ search, onSearch, type: selectedType, onType, compact = false }: ActivityControlsProps) {
  const id = useId();
  return <div className={`activity-controls ${compact ? "activity-controls--compact" : ""}`}>
    <div className="activity-controls__search-wrap">
      <Search size={16} strokeWidth={1.8} aria-hidden="true" />
      <label htmlFor={`${id}-search`} className="sr-only">Search activity</label>
      <input id={`${id}-search`} type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder={compact ? "Search" : "Search activity"} className="activity-controls__search" />
    </div>
    <div role="group" aria-label="Transaction type" className="activity-controls__chips">
      {(["all", "income", "expense", "other"] as const).map(type => <button key={type} type="button" aria-pressed={selectedType === type} onClick={() => onType(type)}>{type === "all" ? "All" : type === "other" ? "Other" : type === "income" ? "Income" : "Expense"}</button>)}
    </div>
  </div>;
}
