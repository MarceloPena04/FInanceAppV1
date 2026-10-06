"use client";

import { Check, ChevronRight, X } from "lucide-react";
import type { ScenarioState } from "../domain/fictional-scenario";
import type { ReportingCurrency } from "../domain/reporting-currency";
import { attentionReasons, type reviewQueue } from "../domain/review-queue";
import { effectiveValues, type TransactionLifecycle } from "../domain/transaction-lifecycle";
import { effectLabel, money } from "./demo-utils";

export interface ReviewPanelProps {
  queue: ReturnType<typeof reviewQueue>;
  state: ScenarioState;
  currency: ReportingCurrency;
  selected: string[];
  onSelected: (ids: string[]) => void;
  onConfirm: (ids: string[]) => void;
  onOpen: (id: string, trigger: HTMLElement) => void;
  onClose?: () => void;
  dedicated?: boolean;
  disabled?: boolean;
}

function ReviewScope({ title, scope, currency }: { title: string; scope: ReviewPanelProps["queue"]["total"]; currency: ReportingCurrency }) {
  return <div className="review-scope"><b>{title} <span>{scope.count} {scope.count === 1 ? "record" : "records"}</span></b><p>+{money(scope.inflowMinor, currency)} inflow · −{money(scope.outflowMinor, currency)} outflow</p><p>{money(scope.unclassifiedMinor, currency)} unclassified · {scope.zeroCount} zero or unavailable</p></div>;
}

function BulkGroup({ records, selected, onSelected, currency, onOpen, disabled }: Pick<ReviewPanelProps, "selected" | "onSelected" | "currency" | "onOpen" | "disabled"> & { records: TransactionLifecycle[] }) {
  return <div className="review-ready-list">{records.map(record => <div key={record.id} id={`review-record-${record.id}`} tabIndex={-1} className="review-ready-row">
    <label className="review-ready-row__label"><input type="checkbox" disabled={disabled} checked={selected.includes(record.id)} onChange={event => onSelected(event.target.checked ? [...new Set([...selected, record.id])] : selected.filter(id => id !== record.id))} /><span><b>{effectiveValues(record).merchantText ?? "Unlabelled activity"}</b><small>No special attention reason · {effectLabel(record, currency)}</small></span></label>
    <button type="button" disabled={disabled} data-record-id={record.id} onClick={event => onOpen(record.id, event.currentTarget)} className="review-button review-button--small">Details</button>
  </div>)}</div>;
}

export function ReviewPanel({ queue, state, currency, selected, onSelected, onConfirm, onOpen, onClose, dedicated = false, disabled = false }: ReviewPanelProps) {
  const ready = queue.ready, selectedReady = selected.filter(id => ready.some(record => record.id === id));
  const coverage = <><div className="review-coverage__grid"><ReviewScope title="This week" scope={queue.week} currency={currency} /><ReviewScope title="All-time history" scope={queue.total} currency={currency} /></div><p className="review-coverage__note">This week is included in all-time history. Possible duplicates count separately until you decide whether they match. Confirming a transaction acknowledges it; detected totals already include it.</p></>;
  return <section className="needs-review-panel" aria-labelledby="review-heading">
    <div className="needs-review-panel__heading"><div><h2 id="review-heading" tabIndex={-1}>Review pending transactions</h2><p>Check the source and fill in any missing details.</p></div>{onClose && <button type="button" className="review-close" onClick={onClose} aria-label="Close review panel"><X size={18} /></button>}</div>
    {dedicated && <div className="review-coverage review-coverage--visible"><h3>Pending totals and coverage</h3>{coverage}</div>}
    {queue.total.count === 0 ? <div className="review-complete"><Check size={20} aria-hidden="true" /><div><b>All caught up for this source.</b><p>Confirmed activity stays in the list. Undoing a confirmation brings it back for review.</p></div></div> : <>
      {!dedicated && <details className="review-coverage"><summary>Review totals and coverage</summary>{coverage}</details>}
      <div className="review-ready"><div className="review-ready__heading"><b>{ready.length} ready to confirm</b><span>Other items need individual attention.</span></div><div className="review-ready__actions">
        <button type="button" disabled={disabled || !ready.length} onClick={() => onSelected(ready.map(record => record.id))} className="review-button">Select all ready</button>
        {selectedReady.length > 0 && <button type="button" disabled={disabled} onClick={() => onSelected([])} className="review-button">Clear selection</button>}
        <button type="button" disabled={disabled || !selectedReady.length} onClick={() => onConfirm(selectedReady)} className="review-button">Confirm selected{selectedReady.length > 0 ? ` (${selectedReady.length})` : ""}</button>
        <button type="button" disabled={disabled || !ready.length} onClick={() => onConfirm(ready.map(record => record.id))} className="review-button review-button--primary">Confirm all ready ({ready.length})</button>
      </div></div>
      {ready.length > 0 && <BulkGroup records={ready} selected={selectedReady} onSelected={onSelected} currency={currency} onOpen={onOpen} disabled={disabled} />}
      <div className="review-attention"><h3>Needs attention <span>({queue.needsAttention.length})</span></h3>{queue.needsAttention.length === 0 ? <p className="review-attention__empty">No missing details or special decisions in this view.</p> : <div className="review-attention__list">{queue.needsAttention.map(record => <button key={record.id} id={`review-record-${record.id}`} type="button" disabled={disabled} data-record-id={record.id} onClick={event => onOpen(record.id, event.currentTarget)} className="review-attention-row"><span><b>{effectiveValues(record).merchantText ?? "Unlabelled activity"}</b><small>{attentionReasons(record, state.records).join(" · ") || "Open this transaction to check its details"}</small></span><strong>{effectLabel(record, currency)}</strong><ChevronRight size={14} aria-hidden="true" /></button>)}</div>}</div>
    </>}
  </section>;
}
