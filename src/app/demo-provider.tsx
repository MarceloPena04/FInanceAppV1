"use client";

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Check, X } from "lucide-react";
import { changeRecord, weeks, type ScenarioState } from "../domain/fictional-scenario";
import { calculateReportingMetrics, type ReportingCurrency } from "../domain/reporting-currency";
import { confirmReady, reviewQueue, visibleActivity } from "../domain/review-queue";
import type { TransactionLifecycle } from "../domain/transaction-lifecycle";
import { sourceScopedRecords, sourceScopeOptions } from "../domain/wallet-source";
import { fixtureRecords, focusedIds, loadScenario, replayFixtures, seededScenario, STORAGE_KEY } from "./demo-utils";
import { TransactionDialog } from "./transaction-dialog";

type Metrics = ReturnType<typeof calculateReportingMetrics>;
interface DemoContextValue {
  state: ScenarioState;
  setState: Dispatch<SetStateAction<ScenarioState>>;
  loaded: boolean;
  savingAvailable: boolean;
  currency: ReportingCurrency;
  selectedWeek: string;
  setWeek: Dispatch<SetStateAction<string>>;
  availableWeeks: string[];
  activeScope: string;
  sourceOptions: ReturnType<typeof sourceScopeOptions>;
  sourceLabel: string;
  scoped: TransactionLifecycle[];
  allTime: Metrics;
  weekly: Metrics;
  queue: ReturnType<typeof reviewQueue>;
  changeSource: (value: string) => void;
  openRecord: (id: string, trigger: HTMLElement) => void;
  confirmSelection: (ids: string[]) => void;
  announce: (message: string) => void;
  processDemo: (all: boolean) => void;
  resetDemo: () => void;
  selectedId?: string;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Demo pages must be inside DemoProvider.");
  return value;
}

// The root layout retains this workspace while Next.js switches between pages.
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScenarioState>(seededScenario);
  const [loaded, setLoaded] = useState(false);
  const [savingAvailable, setSavingAvailable] = useState(true);
  const [week, setWeek] = useState("2026-09-28");
  const [sourceScope, setSourceScope] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [sheetClosing, setSheetClosing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const restored = loadScenario();
      setState(restored.state);
      if (restored.notice) setAnnouncement(restored.notice);
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch {
      const frame = requestAnimationFrame(() => {
        setSavingAvailable(false);
        setAnnouncement("Browser saving is unavailable. Changes will last for this session.");
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [state, loaded]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selectedId) return;
    if (!dialog.open) dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selectedId]);
  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const currency = (state.defaultCurrency ?? "EUR") as ReportingCurrency;
  // A correction may empty the selected week; keep that period selectable.
  const availableWeeks = [...new Set([...weeks(state.records), week])].sort();
  const sourceOptions = sourceScopeOptions(visibleActivity(state.records));
  const activeScope = sourceOptions.some(option => option.key === sourceScope) ? sourceScope : "all";
  const sourceLabel = sourceOptions.find(option => option.key === activeScope)?.label ?? "All sources";
  const scoped = sourceScopedRecords(state.records, activeScope);
  const allTime = calculateReportingMetrics(scoped, currency);
  const weekly = calculateReportingMetrics(scoped, currency, week);
  const queue = reviewQueue(state, currency, week, new Set(scoped.map(record => record.id)));
  const selected = state.records.find(record => record.id === selectedId);

  const announce = (message: string) => {
    setAnnouncement(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setAnnouncement(""), 6000);
  };
  const openRecord = (id: string, trigger: HTMLElement) => {
    if (sheetClosing || !loaded) return;
    triggerRef.current = trigger;
    setSelectedId(id);
  };
  const closeDialog = (message = "", focusId = selectedId) => {
    if (sheetClosing) return;
    if (message) announce(message);
    setSheetClosing(true);
    const finish = () => {
      closeTimerRef.current = null;
      dialogRef.current?.close();
      setSelectedId(undefined);
      setSheetClosing(false);
      requestAnimationFrame(() => {
        const matching = [...document.querySelectorAll<HTMLElement>("[data-record-id]")].find(item => item.dataset.recordId === focusId);
        const next = matching ?? (triggerRef.current?.isConnected ? triggerRef.current : undefined) ?? document.getElementById("page-heading");
        next?.focus({ preventScroll: true });
      });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else closeTimerRef.current = setTimeout(finish, 180);
  };
  const update = (id: string, kind: NonNullable<TransactionLifecycle["actionHistory"]>[number]["kind"], detail: string, fn: (record: TransactionLifecycle) => TransactionLifecycle) => setState(current => changeRecord(current, id, kind, detail, fn));
  const confirmSelection = (ids: string[]) => {
    if (!loaded) return;
    const validIds = ids.filter(id => queue.ready.some(record => record.id === id));
    if (!validIds.length) return;
    setState(current => confirmReady(current, currency, week, validIds));
    announce(`${validIds.length} ${validIds.length === 1 ? "transaction confirmed" : "transactions confirmed"}. Detected flow is unchanged; these movements were already counted.`);
  };
  const processDemo = (all: boolean) => {
    if (!loaded) return;
    setState(current => replayFixtures(current, all));
    announce(all ? `All ${fixtureRecords.length} notices processed. Existing decisions are preserved.` : `${focusedIds.length} notices reprocessed. Existing transactions and decisions are preserved.`);
  };
  const resetDemo = () => {
    if (!loaded) return;
    setState(seededScenario());
    setWeek("2026-09-28");
    setSourceScope("all");
    announce("Workspace reset. The original notices are ready to review.");
  };

  return <DemoContext.Provider value={{ state, setState, loaded, savingAvailable, currency, selectedWeek: week, setWeek, availableWeeks, activeScope, sourceOptions, sourceLabel, scoped, allTime, weekly, queue, changeSource: setSourceScope, openRecord, confirmSelection, announce, processDemo, resetDemo, selectedId }}>
    {children}
    <TransactionDialog dialogRef={dialogRef} record={selected} records={state.records} currency={currency} closing={sheetClosing} onClose={() => closeDialog()} onComplete={closeDialog} setState={setState} update={update} />
    <div className="demo-toast" role="status" aria-live="polite" aria-atomic="true">{announcement && <><Check size={16} /><p>{announcement}</p><button onClick={() => setAnnouncement("")} aria-label="Dismiss feedback"><X size={14} /></button></>}</div>
  </DemoContext.Provider>;
}
