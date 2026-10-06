import { Search } from "lucide-react";
import { useId } from "react";
import type { ActivityTypeFilter, SourceScopeOption } from "../domain/wallet-source";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  type: ActivityTypeFilter;
  onType: (value: ActivityTypeFilter) => void;
  compact?: boolean;
}

export function SourceSelector({ value, onChange, options, compact = false }: { value: string; onChange: (value: string) => void; options: SourceScopeOption[]; compact?: boolean }) {
  const id = useId();
  const groups = [
    { key: "bank", label: "Banks" },
    { key: "account", label: "Accounts and cards" },
    { key: "assigned", label: "Assigned by you" },
  ] as const;
  return <div className={`source-selector ${compact ? "source-selector--compact" : ""}`}>
    <label htmlFor={id} className={compact ? "sr-only" : "source-selector__caption"}>Viewing source</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} aria-label="Viewing source" className="source-selector__select">
      <option value="all">All sources</option>
      {groups.map(group => {
        const members = options.filter(option => option.group === group.key);
        return members.length ? <optgroup key={group.key} label={group.label}>{members.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</optgroup> : null;
      })}
      <option value="unassigned">Source not identified</option>
    </select>
  </div>;
}

export function ActivityControls(props: Props) {
  const id = useId();
  return <div className={`activity-controls ${props.compact ? "activity-controls--compact" : ""}`}>
    <div className="activity-controls__search-wrap">
      <Search size={18} strokeWidth={2} aria-hidden="true" />
      <label htmlFor={`${id}-search`} className="sr-only">Search activity</label>
      <input id={`${id}-search`} type="search" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder={props.compact ? "Search" : "Search activity"} className="activity-controls__search" />
    </div>
    <div role="group" aria-label="Transaction type" className="activity-controls__chips">
      {(["all", "income", "expense", "other"] as const).map(type => <button key={type} type="button" aria-pressed={props.type === type} onClick={() => props.onType(type)}>{type === "all" ? "All" : type === "other" ? "Other" : type === "income" ? "Income" : "Expense"}</button>)}
    </div>
  </div>;
}
