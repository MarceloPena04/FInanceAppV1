import { useId } from "react";
import type { ActivityTypeFilter } from "../domain/wallet-source";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  type: ActivityTypeFilter;
  onType: (value: ActivityTypeFilter) => void;
  wallet: string;
  onWallet: (value: string) => void;
  wallets: Array<{ key: string; label: string }>;
  view: "all" | "week";
  onView: (value: "all" | "week") => void;
  compact?: boolean;
}

export function ActivityControls(props: Props) {
  const id = useId();
  return <div className={`activity-controls ${props.compact ? "activity-controls--compact" : ""}`}>
    <div className="activity-controls__top">
      <label htmlFor={`${id}-search`} className="sr-only">Search activity</label>
      <input id={`${id}-search`} type="search" value={props.search} onChange={event => props.onSearch(event.target.value)} placeholder="Search activity" className="activity-controls__search" />
      <label htmlFor={`${id}-wallet`} className="sr-only">Filter by wallet</label>
      <select id={`${id}-wallet`} value={props.wallet} onChange={event => props.onWallet(event.target.value)} aria-label="Filter by wallet" className="activity-controls__wallet">
        <option value="all">All sources</option>
        {props.wallets.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        <option value="unassigned">Unassigned / unidentified</option>
      </select>
    </div>
    <div className="activity-controls__bottom">
      <div role="group" aria-label="Transaction type" className="activity-controls__chips">
        {(["all", "income", "expense", "other"] as const).map(type => <button key={type} type="button" aria-pressed={props.type === type} onClick={() => props.onType(type)}>{type === "all" ? "All" : type === "other" ? "Other" : type === "income" ? "Income" : "Expense"}</button>)}
      </div>
      <div role="group" aria-label="Activity period" className="activity-controls__period">
        <button type="button" aria-pressed={props.view === "all"} onClick={() => props.onView("all")}>All dates</button>
        <button type="button" aria-pressed={props.view === "week"} onClick={() => props.onView("week")}>This week</button>
      </div>
    </div>
  </div>;
}
