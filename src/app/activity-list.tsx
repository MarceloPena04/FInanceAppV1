"use client";

import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { activityDayLabel, activityWeekLabel, groupActivityByWeekAndDay } from "../domain/activity-grouping";
import { reportingEventEffect, type ReportingCurrency } from "../domain/reporting-currency";
import { effectiveValues, type TransactionLifecycle } from "../domain/transaction-lifecycle";
import { walletForRecord } from "../domain/wallet-source";
import { effectLabel, humanDate, sourceProviderLabel } from "./demo-utils";

export interface ActivityListProps {
  records: TransactionLifecycle[];
  allRecords: TransactionLifecycle[];
  currency: ReportingCurrency;
  onOpen: (id: string, trigger: HTMLElement) => void;
}

function ActivityCard({ record, allRecords, currency, onOpen }: { record: TransactionLifecycle } & Omit<ActivityListProps, "records">) {
  const value = effectiveValues(record), wallet = walletForRecord(record);
  const effect = reportingEventEffect(record, currency);
  const direction = ["income", "refund", "reversal"].includes(value.eventType) ? "income" : ["purchase", "generic_expense"].includes(value.eventType) ? "expense" : "other";
  const directionLabel = direction === "income" ? "Income" : direction === "expense" ? "Expense" : value.eventType === "unknown" ? "Unclassified" : "Other movement";
  const possibleDuplicate = allRecords.some(item => item.relationships.some(rel => rel.kind === "possible_duplicate_of" && (item.id === record.id || rel.targetId === record.id)));
  const status = record.disposition === "excluded" ? "Excluded" : record.confirmationState === "confirmed" ? "Confirmed" : "Needs review";
  const statusKey = record.disposition === "excluded" ? "excluded" : record.confirmationState === "confirmed" ? "confirmed" : "pending";
  const providers = [...new Set(record.sourceProvenance.map(source => sourceProviderLabel(source.provider, source.sourceType)))];
  return <button type="button" onClick={event => onOpen(record.id, event.currentTarget)} className="activity-card" data-record-id={record.id} data-direction={direction} data-status={statusKey}>
    <span className="activity-card__icon" aria-hidden="true">{direction === "income" ? "+" : direction === "expense" ? "−" : "↔"}</span>
    <span className="activity-card__body">
      <span className="activity-card__title">{value.merchantText ?? "Unlabelled activity"}</span>
      <span className="activity-card__source">{wallet.basis === "user" ? `${wallet.label} · assigned by you` : wallet.basis === "conflict" ? wallet.label : wallet.detail}</span>
      <span className="activity-card__meta">{humanDate(record)} · {directionLabel}{possibleDuplicate ? " · Possible duplicate" : ""}</span>
      <span className="activity-card__evidence">{providers.join(" · ")}{record.sourceProvenance.length > 1 ? ` · ${record.sourceProvenance.length} source notices` : ""}</span>
    </span>
    <span className="activity-card__right">
      <strong data-positive={record.disposition !== "excluded" && effect.inflowMinor > 0}>{effectLabel(record, currency)}</strong>
      <small className="activity-card__status">{statusKey === "confirmed" && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}{statusKey === "pending" && <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />}{status}</small>
      {statusKey === "excluded" && <small className="activity-card__restore">Open to restore</small>}
    </span>
    <ChevronRight className="activity-card__chevron" size={14} aria-hidden="true" />
  </button>;
}

export function ActivityList({ records, allRecords, currency, onOpen }: ActivityListProps) {
  const groups = groupActivityByWeekAndDay(records);
  if (!groups.length) return <div className="activity-empty"><p>No activity matches this view.</p><span>Choose another week or date range, try another source, or clear the search and type filter.</span></div>;
  return <div className="activity-groups">{groups.map(group => <section key={group.week} className="activity-week" data-week={group.week}>
    <h3 className="activity-week__title">{activityWeekLabel(group.week)}</h3>
    <div className="activity-week__days">{group.days.map(day => <section key={day.day} className="activity-day" data-day={day.day}>
      {day.day !== "unknown" && <h4 className="activity-day__title">{activityDayLabel(day.day)}</h4>}
      <div className="activity-day__records">{day.records.map(record => <ActivityCard key={record.id} record={record} allRecords={allRecords} currency={currency} onOpen={onOpen} />)}</div>
    </section>)}</div>
  </section>)}</div>;
}
