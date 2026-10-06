"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, RotateCcw } from "lucide-react";
import { visibleActivity } from "../../domain/review-queue";
import { useDemo } from "../demo-provider";
import { fixtureRecords, focusedIds } from "../demo-utils";
import "../support-pages.css";

export default function DemoPage() {
  const { state, loaded, processDemo, resetDemo, openRecord } = useDemo();
  const [resetRequested, setResetRequested] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const traceCounts = state.traces.reduce((counts, trace) => ({ ...counts, [trace.outcome]: (counts[trace.outcome] ?? 0) + 1 }), {} as Record<string, number>);

  const cancelReset = () => {
    setResetRequested(false);
    requestAnimationFrame(() => resetButtonRef.current?.focus());
  };

  return <div className="support-page">
    <section className="demo-summary-card demo-guide-summary" aria-labelledby="demo-intro-heading">
      <div className="demo-summary-icon"><BookOpen size={21} /></div><p className="eyebrow">Workspace guide</p><h2 id="demo-intro-heading">Follow the flow.</h2><p>Review transactions, correct details, and resolve duplicates. Your changes update the figures across your workspace.</p>
      <div className="demo-summary-stats"><p><b>{visibleActivity(state.records).length}</b><span>visible events</span></p><p><b>{state.traces.length}</b><span>notices processed</span></p></div>
    </section>

    <section className="support-card" aria-labelledby="walkthrough-heading">
      <div className="section-heading"><div><h2 id="walkthrough-heading">Navigate your workspace</h2></div></div>
      <ol className="demo-walkthrough">
        <li><b>Start with the figures.</b><p><Link href="/">Overview</Link> shows detected flow and the weekly chart. Change the source or display currency to see the same activity from another view.</p></li>
        <li><b>Clear what is ready.</b><p>Open <Link href="/review">Review &amp; approvals</Link> and confirm ready movements. Their money is already counted; items needing attention stay available for individual review.</p></li>
        <li><b>Inspect a notice.</b><p>On <Link href="/transactions">Transactions</Link>, open an unclassified movement, choose a type, and save. Inspect the original evidence, resolve a possible duplicate, or undo a correction.</p></li>
        <li><b>Understand the figures.</b><p><Link href="/reports">Flow details</Link> shows daily amounts and each record’s contribution to your totals.</p></li>
      </ol>
    </section>

    <section className="support-card" aria-labelledby="demo-tools-heading">
      <div className="section-heading"><div><h2 id="demo-tools-heading">Workspace tools</h2><p className="muted">Reprocess notices or restore the starting transactions.</p></div></div>
      <div className="demo-utilities demo-page-utilities">
        <button className="button" disabled={!loaded} onClick={() => processDemo(false)}><RotateCcw size={13} />Reprocess {focusedIds.length} notices</button>
        <button className="button" disabled={!loaded} onClick={() => processDemo(true)}>Process all {fixtureRecords.length} notices</button>
        <button ref={resetButtonRef} className="button reset-button" disabled={!loaded} aria-expanded={resetRequested} aria-controls="reset-demo-prompt" onClick={() => { setResetRequested(true); requestAnimationFrame(() => cancelButtonRef.current?.focus()); }}>Reset workspace</button>
      </div>
      {resetRequested && <div id="reset-demo-prompt" className="reset-demo-prompt" role="alert"><b>Reset your workspace?</b><p>This restores the starting transactions and clears your review decisions.</p><div><button ref={cancelButtonRef} className="button" onClick={cancelReset}>Keep my decisions</button><button className="button button--coral" onClick={() => { setResetRequested(false); resetDemo(); requestAnimationFrame(() => resetButtonRef.current?.focus()); }}>Reset workspace</button></div></div>}
      <p className="support-note">Reprocessing preserves existing transactions and review decisions. Reset clears your corrections, duplicate choices, and confirmations.</p>
    </section>

    <section className="support-card" aria-labelledby="trace-heading">
      <div className="section-heading"><div><h2 id="trace-heading">Processing history</h2><p className="muted">The notices behind your activity, including ignored and rejected captures.</p></div><span className="count-pill">{state.traces.length} notices</span></div>
      <div className="trace-counts">{Object.entries(traceCounts).map(([outcome, count]) => <span key={outcome}>{count} {outcome}</span>)}</div>
      <details className="demo-trace-details"><summary>Inspect notice history<ChevronRight size={14} /></summary><ol className="trace-list demo-page-traces">{state.traces.map(trace => <li key={trace.order}>
        <p><b>{trace.order}. {trace.id.replaceAll("-", " ")}</b><span>{trace.outcome}</span></p><p>{trace.lifecycle ?? trace.reason}</p>
        <details><summary>Source notice and evidence</summary><p className="trace-notice">{trace.capture.rawText}</p>{trace.evidence?.length ? <ul>{trace.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}{trace.matchEvidence?.length ? <ul>{trace.matchEvidence.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}</details>
        {trace.eventId && state.records.some(record => record.id === trace.eventId) && <button className="support-link trace-event-link" disabled={!loaded} onClick={event => openRecord(trace.eventId!, event.currentTarget)}>Open related event<ChevronRight size={12} /></button>}
      </li>)}</ol></details>
    </section>
  </div>;
}
