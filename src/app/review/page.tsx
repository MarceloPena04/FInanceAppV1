"use client";

import { AlertTriangle, CheckCircle2, CalendarDays } from "lucide-react";
import { useState } from "react";
import { useDemo } from "../demo-provider";
import { ReviewPanel } from "../review-panel";
import { ScopeControls } from "../scope-controls";
import "../activity-pages.css";

function ReviewWorkspace() {
  const { state, loaded, currency, queue, sourceLabel, openRecord, confirmSelection } = useDemo();
  const [selected, setSelected] = useState<string[]>([]);
  const selectedReady = selected.filter(id => queue.ready.some(record => record.id === id));

  const confirm = (ids: string[]) => {
    confirmSelection(ids);
    setSelected([]);
    requestAnimationFrame(() => document.getElementById("review-heading")?.focus({ preventScroll: true }));
  };

  return <>
    <div className="review-page-intro"><p>Confirm ready entries together, or open a warning to check missing details and duplicate decisions.</p><ScopeControls /></div>
    <div className="review-page-summary" aria-label="Review summary">
      <div className="review-page-stat review-page-stat--ready"><CheckCircle2 size={18} aria-hidden="true" /><div><b>{queue.ready.length}</b><span>Ready to confirm</span></div></div>
      <div className="review-page-stat review-page-stat--attention"><AlertTriangle size={18} aria-hidden="true" /><div><b>{queue.needsAttention.length}</b><span>Need attention</span></div></div>
      <div className="review-page-stat"><CalendarDays size={18} aria-hidden="true" /><div><b>{queue.week.count}</b><span>Pending this week</span></div></div>
    </div>
    <p className="review-page-scope">All-time queue · {sourceLabel}</p>
    {!loaded && <p className="route-loading" role="status">Loading your workspace…</p>}
    <ReviewPanel queue={queue} state={state} currency={currency} selected={selectedReady} onSelected={setSelected} onConfirm={confirm} onOpen={openRecord} dedicated disabled={!loaded} />
  </>;
}

export default function ReviewPage() {
  const { activeScope } = useDemo();
  // Changing source clears bulk selection rather than carrying it into another queue.
  return <div className="review-page"><ReviewWorkspace key={activeScope} /></div>;
}
