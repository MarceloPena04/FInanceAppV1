"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { activityRangeLabel, dateRangeError, type ActivityDateRange } from "../domain/activity-period";
import "./transaction-period-picker.css";

interface PeriodPickerProps {
  range: ActivityDateRange;
  custom: boolean;
  week: string;
  weeks: string[];
  disabled: boolean;
  onWeek: (week: string) => void;
  onRange: (range: ActivityDateRange) => void;
}

function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function CalendarMonth({ month, range, onPick }: { month: string; range: ActivityDateRange; onPick: (date: string) => void }) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const heading = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const label = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return <section className="range-month" aria-label={heading}>
    <h3>{heading}</h3>
    <div className="range-month__weekdays" aria-hidden="true">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="range-month__days">{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}{Array.from({ length: last.getUTCDate() }, (_, index) => {
      const key = `${month}-${String(index + 1).padStart(2, "0")}`;
      const endpoint = key === range.start || key === range.end;
      const inside = !!range.start && !!range.end && key > range.start && key < range.end;
      return <button key={key} type="button" aria-label={label.format(new Date(`${key}T00:00:00Z`))} aria-pressed={endpoint} data-endpoint={endpoint} data-inside={inside} onClick={() => onPick(key)}>{index + 1}</button>;
    })}</div>
  </section>;
}

export function TransactionPeriodPicker({ range, custom, week, weeks, disabled, onWeek, onRange }: PeriodPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ActivityDateRange>(range);
  const [month, setMonth] = useState(range.start.slice(0, 7));
  const [endpoint, setEndpoint] = useState<"start" | "end">("start");
  const [opened, setOpened] = useState(false);
  const error = dateRangeError(draft);

  const close = () => {
    dialogRef.current?.close();
    setOpened(false);
    triggerRef.current?.focus();
  };
  const open = () => {
    setDraft(range);
    setMonth(range.start.slice(0, 7));
    setEndpoint("start");
    setOpened(true);
    dialogRef.current?.showModal();
    requestAnimationFrame(() => startRef.current?.focus());
  };
  const pick = (date: string) => {
    if (endpoint === "start" || !draft.start || date < draft.start) {
      setDraft({ start: date, end: "" });
      setEndpoint("end");
    } else {
      setDraft(current => ({ ...current, end: date }));
      setEndpoint("start");
    }
  };
  const changeStart = (start: string) => {
    setDraft(current => ({ ...current, start }));
    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) setMonth(start.slice(0, 7));
  };
  const changeEnd = (end: string) => setDraft(current => ({ ...current, end }));

  return <div className="transaction-period-picker">
    <label className="week-control"><CalendarDays size={14} /><span>Week of</span><select aria-label="Selected week" disabled={disabled} value={custom ? "custom" : week} onChange={event => onWeek(event.target.value)}>{custom && <option value="custom" disabled>Custom dates</option>}{weeks.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <button ref={triggerRef} type="button" className="range-picker-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={opened} aria-controls="transaction-date-range" onClick={open}><CalendarDays size={14} /><span>{custom ? activityRangeLabel(range) : "Choose dates"}</span></button>
    <dialog ref={dialogRef} id="transaction-date-range" className="range-calendar-dialog" aria-labelledby="range-calendar-heading" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
      <div className="range-calendar-heading"><div><h2 id="range-calendar-heading">Choose your dates</h2><p>Start and end dates are both included.</p></div><button type="button" className="icon-button" aria-label="Close date calendar" onClick={close}><X size={17} /></button></div>
      <div className="range-date-inputs">
        <label data-active={endpoint === "start"}>Start date<input ref={startRef} type="date" aria-label="Range start date" value={draft.start} onFocus={() => setEndpoint("start")} onInput={event => changeStart(event.currentTarget.value)} onChange={event => changeStart(event.target.value)} /></label>
        <label data-active={endpoint === "end"}>End date<input type="date" aria-label="Range end date" value={draft.end} onFocus={() => setEndpoint("end")} onInput={event => changeEnd(event.currentTarget.value)} onChange={event => changeEnd(event.target.value)} aria-invalid={!!draft.end && !!error} aria-describedby={draft.end && error ? "range-calendar-error" : undefined} /></label>
      </div>
      <div className="range-calendar-navigation"><button type="button" aria-label="Previous month" onClick={() => setMonth(current => shiftMonth(current, -1))}><ChevronLeft size={17} /></button><p role="status" aria-live="polite">{!error ? "Dates selected · apply when ready" : endpoint === "end" ? "Choose your end date" : "Choose your start date"}</p><button type="button" aria-label="Next month" onClick={() => setMonth(current => shiftMonth(current, 1))}><ChevronRight size={17} /></button></div>
      <div className="range-calendars"><CalendarMonth month={month} range={draft} onPick={pick} /><CalendarMonth month={shiftMonth(month, 1)} range={draft} onPick={pick} /></div>
      {!!draft.end && !!error && <p id="range-calendar-error" className="range-calendar-error" role="alert">{error}</p>}
      <div className="range-calendar-actions"><button type="button" className="button" onClick={close}>Cancel</button><button type="button" className="button range-calendar-apply" disabled={!!error} onClick={() => { if (!error) { onRange(draft); close(); } }}><Check size={14} />Apply dates</button></div>
    </dialog>
  </div>;
}
