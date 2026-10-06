"use client";

/* The editor reports its draft state to the owning native dialog. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction, type SyntheticEvent } from "react";
import { AlertTriangle, Check, RotateCcw, X } from "lucide-react";
import { changeRecord, confirmRecord, duplicateDecision, undoConfirmation, type ScenarioState } from "../domain/fictional-scenario";
import { attentionReasons, linkedEvidence } from "../domain/review-queue";
import { convertMinor, SUPPORTED_REPORTING_CURRENCIES, type ReportingCurrency } from "../domain/reporting-currency";
import { canConfirm, clearUserOverrides, effectiveValues, groupingDate, sourceIdentityConflict, type TransactionLifecycle } from "../domain/transaction-lifecycle";
import type { TransactionKind } from "../domain/transaction-candidate";
import { walletForRecord, walletOptions } from "../domain/wallet-source";
import { counterpart, duplicateOwnerId, effectLabel, humanDate, labels, money, sourceProviderLabel } from "./demo-utils";
import "./transaction-dialog.css";

type Overrides = TransactionLifecycle["userOverrides"];
type ActionKind = NonNullable<TransactionLifecycle["actionHistory"]>[number]["kind"];

interface TransactionDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  record?: TransactionLifecycle;
  records: TransactionLifecycle[];
  currency: ReportingCurrency;
  closing: boolean;
  onClose: () => void;
  onComplete: (message: string, focusId?: string) => void;
  setState: Dispatch<SetStateAction<ScenarioState>>;
  update: (id: string, kind: ActionKind, detail: string, fn: (record: TransactionLifecycle) => TransactionLifecycle) => void;
}

function readyToConfirm(record: TransactionLifecycle, records: TransactionLifecycle[]) {
  const value = effectiveValues(record);
  return canConfirm(record) && Number.isSafeInteger(value.amountMinor) && (value.amountMinor ?? 0) > 0 &&
    SUPPORTED_REPORTING_CURRENCIES.includes(value.currency as ReportingCurrency) &&
    attentionReasons(record, records).every(reason => reason === "Neutral money movement");
}

function ConversionLine({ record, currency }: { record: TransactionLifecycle; currency: ReportingCurrency }) {
  const value = effectiveValues(record);
  if (value.amountMinor === undefined || !value.currency) return <p className="transaction-value-note">{value.amountMinor === undefined ? "Amount unavailable" : "Choose a currency to use this amount"} · zero effect</p>;
  const converted = convertMinor(value.amountMinor, value.currency, currency);
  if (!converted) return <p className="transaction-value-note">This currency is not supported · zero effect</p>;
  const basis = value.currencyBasis === "user_corrected" ? "reviewed by you" : value.currencyBasis === "assumed_default" ? "assumed from the app default" : "supplied by the source";
  return <div className="transaction-value">
    <p>{money(value.amountMinor, value.currency as ReportingCurrency)}{value.currency !== currency && <span> → {money(converted.reportingAmountMinor, currency)}</span>}</p>
    <span>Currency {basis}{value.currency !== currency && ` · conversion rate ${converted.rateLabel}`}</span>
    <small>Detected flow: {effectLabel(record, currency)}</small>
    {value.eventType === "unknown" && <small className="transaction-attention-text">Choose a type before this amount affects detected net flow.</small>}
  </div>;
}

function maskedEnding(reference: string) {
  const ending = reference.match(/\d{2,4}$/)?.[0];
  return ending ? `••${ending}` : "ending unavailable";
}

function SourceNotices({ record }: { record: TransactionLifecycle }) {
  return <div className="transaction-source-notices">{record.sourceCandidates.map((candidate, index) => {
    const source = record.sourceProvenance.find(item => item.captureId === candidate.captureId);
    return <div key={candidate.captureId} className="transaction-source-notice">
      <p><b>{source ? sourceProviderLabel(source.provider, source.sourceType) : `Notice ${index + 1}`}</b>{candidate.capturedAt && <span> · {candidate.capturedAt}</span>}</p>
      {candidate.sourceFacts.evidence.length ? <ul>{candidate.sourceFacts.evidence.map((field, fieldIndex) => <li key={`${field.field}:${fieldIndex}`}><span>{labels[field.field] ?? field.field.replaceAll(/([A-Z])/g, " $1").toLowerCase()}:</span> “{field.field === "card" ? maskedEnding(field.excerpt) : field.excerpt}”</li>)}</ul> : <p>No source excerpt is available.</p>}
      <p className="transaction-provenance">Notice {candidate.captureId}</p>{source && <p className="transaction-provenance">{[source.institutionName, source.accountReference && `Account ${maskedEnding(source.accountReference)}`, source.paymentInstrumentReference && `Card ${maskedEnding(source.paymentInstrumentReference)}`, source.transactionReference && `Reference ${source.transactionReference}`].filter(Boolean).join(" · ") || "The notice did not supply an account or card."}</p>}
    </div>;
  })}</div>;
}

export function TransactionDialog({ dialogRef, record, records, currency, closing, onClose, onComplete, setState, update }: TransactionDialogProps) {
  const [dirty, setDirty] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [discardWarning, setDiscardWarning] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setDirty(false); setActionError(""); setActionNotice(""); setDiscardWarning(false); }, [record?.id]);
  useEffect(() => { if (discardWarning) keepEditingRef.current?.focus(); }, [discardWarning]);
  const handleDirtyChange = useCallback((changed: boolean) => { setDirty(changed); setActionError(""); if (changed) setActionNotice(""); }, []);
  const requestClose = () => {
    if (closing) return;
    if (dirty) setDiscardWarning(true);
    else onClose();
  };
  const cancel = (event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); requestClose(); };
  if (!record) return <dialog ref={dialogRef} className="transaction-dialog" onCancel={cancel} />;

  const value = effectiveValues(record);
  const pair = counterpart(record, records);
  const ownerId = duplicateOwnerId(record, pair);
  const retained = record.relationships.find(rel => rel.kind === "duplicate_of");
  const retainedRecord = retained ? records.find(item => item.id === retained.targetId) ?? record : record;
  const evidence = linkedEvidence(retainedRecord, records);
  const separateOwner = records.find(item => item.relationships.some(rel => rel.kind === "separate_from" && (item.id === record.id || rel.targetId === record.id)));
  const reasons = attentionReasons(record, records);
  const blockingReasons = reasons.filter(reason => reason !== "Neutral money movement");
  const wallet = walletForRecord(record);
  const neutral = ["transfer", "withdrawal"].includes(value.eventType);
  const pending = record.confirmationState === "needs_confirmation";
  const directConfirmReady = readyToConfirm(record, records);
  const finish = (message: string, focusId = record.id) => { setActionError(""); setDiscardWarning(false); onComplete(message, focusId); };
  const confirmCurrent = () => {
    if (dirty) { setActionError("Save or discard your edits before confirming."); return; }
    if (!directConfirmReady) { setActionError("Resolve the highlighted details before confirming."); return; }
    setState(current => confirmRecord(current, record.id));
    finish(neutral ? "Neutral movement confirmed. Detected net flow is unchanged." : "Transaction confirmed.");
  };
  const decideDuplicate = (choice: "same" | "separate") => {
    if (dirty) { setActionError("Save or discard your edits before comparing these notices."); return; }
    if (!ownerId || !pair) { setActionError("The paired notice is unavailable. No decision was saved."); return; }
    setState(current => {
      const next = duplicateDecision(current, ownerId, choice);
      return { ...next, records: next.records.map(item => [record.id, pair.id].includes(item.id) && !readyToConfirm(item, next.records) ? { ...item, confirmationState: "needs_confirmation" as const } : item) };
    });
    finish(choice === "same" ? "Notices linked and counted once. Any missing details still need review." : "Notices kept as separate transactions.", choice === "same" && ownerId === record.id ? pair.id : record.id);
  };
  const undoDuplicate = (id: string) => {
    if (dirty) { setActionError("Save or discard your edits before undoing this decision."); return; }
    setState(current => duplicateDecision(current, id, "undo"));
    finish("Duplicate decision undone. Both notices are available for review.", id);
  };

  return <dialog ref={dialogRef} className="transaction-dialog" data-closing={closing ? "true" : "false"} aria-labelledby="transaction-title" aria-describedby="transaction-date" onCancel={cancel} onClick={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className="transaction-sheet-content">
      <header className="transaction-dialog-header">
        <div><p className="transaction-eyebrow">Transaction details</p><h2 id="transaction-title">{value.merchantText?.trim() || "Unlabelled activity"}</h2></div>
        <button type="button" autoFocus onClick={requestClose} className="transaction-close" aria-label="Close transaction details"><X size={19} /></button>
      </header>
      <p id="transaction-date" className="transaction-date">{humanDate(record)} · {labels[groupingDate(record).basis]}</p>
      <div className="transaction-status-row"><span data-status={record.disposition === "excluded" ? "excluded" : pending ? "pending" : "confirmed"}>{record.disposition === "excluded" ? "Excluded" : pending ? "Needs review" : "Confirmed"}</span><span>{labels[value.eventType] ?? value.eventType}</span>{record.interpretation.settlementState === "pending" && <span>Pending authorization</span>}{record.interpretation.settlementState === "finalized" && <span>Finalized notice</span>}</div>
      <ConversionLine record={record} currency={currency} />

      {discardWarning && <section className="transaction-discard-warning" role="alert" aria-labelledby="discard-title"><h3 id="discard-title">Discard unsaved changes?</h3><p>Your saved transaction will stay as it was before these edits.</p><div className="transaction-buttons"><button ref={keepEditingRef} type="button" className="transaction-button transaction-button-primary" onClick={() => { setDiscardWarning(false); requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>(".transaction-editor input")?.focus()); }}>Keep editing</button><button type="button" className="transaction-button transaction-button-danger" onClick={() => { setDirty(false); setDiscardWarning(false); onClose(); }}>Discard and close</button></div></section>}

      <section className="transaction-origin"><h3>Where it came from</h3><p>{wallet.label}{wallet.basis === "user" && " · assigned by you"}</p><small>{wallet.detail}</small><small>Delivered by {record.sourceProvenance.map(source => sourceProviderLabel(source.provider, source.sourceType)).filter((source, index, all) => all.indexOf(source) === index).join(", ")}. Account details come from the notice or your assignment.</small></section>

      {pending && neutral && <section className="transaction-neutral" aria-labelledby="neutral-decision-title"><h3 id="neutral-decision-title">Check this neutral movement</h3><p>This {value.eventType === "transfer" ? "transfer" : "withdrawal"} has zero effect on detected net flow. If it was spending or money received, change its type below.</p><button type="button" onClick={confirmCurrent} disabled={dirty || !directConfirmReady} className="transaction-button transaction-button-primary">Confirm as neutral · no flow change</button></section>}
      {pending && blockingReasons.length > 0 && <section className="transaction-guidance" aria-labelledby="review-guidance-title"><h3 id="review-guidance-title"><AlertTriangle size={16} /> Check before confirming</h3><ul>{blockingReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{record.evidenceConflict && <p>{record.evidenceConflict}</p>}</section>}

      <Editor key={`${record.id}:${record.actionHistory?.length ?? 0}`} record={record} records={records} wallets={walletOptions(records)} allowConfirm={!pair} onDirtyChange={handleDirtyChange} onSave={(overrides, confirmAfterSave, evidenceReviewed) => {
        const proposed: TransactionLifecycle = { ...record, userOverrides: { ...record.userOverrides, ...overrides }, evidenceConflict: evidenceReviewed ? undefined : record.evidenceConflict, confirmationState: "needs_confirmation" };
        if (confirmAfterSave && !readyToConfirm(proposed, records.map(item => item.id === record.id ? proposed : item))) { setActionError("Resolve the possible duplicate, currency, type, or source conflict before confirming."); return; }
        setState(current => {
          const next = changeRecord(current, record.id, "edited", "Reviewed transaction details", item => ({ ...item, userOverrides: { ...item.userOverrides, ...overrides }, evidenceConflict: evidenceReviewed ? undefined : item.evidenceConflict, confirmationState: "needs_confirmation" }));
          return confirmAfterSave ? confirmRecord(next, record.id) : next;
        });
        setDirty(false);
        finish(confirmAfterSave ? ["transfer", "withdrawal"].includes(effectiveValues(proposed).eventType) ? "Neutral movement confirmed. Detected net flow is unchanged." : "Changes saved and transaction confirmed." : "Changes saved. Transaction is available for review.");
      }} undo={field => {
        if (dirty) { setActionError("Save or discard your edits before undoing a field."); return; }
        update(record.id, "edited", `Undo ${field}`, item => ({ ...clearUserOverrides(item, field === "walletLabel" ? ["walletId", "walletLabel"] : [field]), confirmationState: "needs_confirmation" }));
        const fieldLabel = { amountMinor: "Corrected amount", currency: "Corrected currency", eventType: "Corrected type", merchantLabel: "Corrected description", occurredAt: "Corrected date", walletLabel: "Wallet assignment" }[field as "amountMinor" | "currency" | "eventType" | "merchantLabel" | "occurredAt" | "walletLabel"];
        setActionNotice(field === "walletLabel" ? "Wallet assignment undone. Source grouping restored." : `${fieldLabel?.replace("Corrected ", "") ?? "Field"} correction removed. Original details restored.`);
        if (fieldLabel) requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>(`[aria-label="${fieldLabel}"]`)?.focus());
      }} />
      {dirty && <p className="transaction-unsaved-note">You have unsaved edits.</p>}
      {actionNotice && <p role="status" aria-live="polite" className="transaction-detail-note">{actionNotice}</p>}
      {actionError && <p role="alert" className="transaction-action-error">{actionError}</p>}

      <div className="transaction-buttons transaction-review-actions">
        {record.confirmationState === "confirmed" ? <button type="button" disabled={dirty} onClick={() => { setState(current => undoConfirmation(current, record.id)); finish("Confirmation undone. Transaction needs review again."); }} className="transaction-button"><RotateCcw size={14} /> Undo confirmation</button> : !neutral && <button type="button" onClick={confirmCurrent} disabled={dirty || !directConfirmReady} className="transaction-button transaction-button-primary"><Check size={14} /> Confirm transaction</button>}
        <button type="button" disabled={dirty} onClick={() => { const excluded = record.disposition !== "excluded"; update(record.id, excluded ? "excluded" : "restored", excluded ? "Excluded from detected flow" : "Restored to detected flow", item => ({ ...item, disposition: excluded ? "excluded" : "active" })); finish(excluded ? "Transaction excluded from detected flow." : "Transaction restored to detected flow."); }} className="transaction-button">{record.disposition === "excluded" ? "Restore transaction" : "Exclude transaction"}</button>
      </div>

      {pair && <details className="transaction-detail-section transaction-duplicate" open><summary>Possible duplicate · compare notices</summary><p>{effectiveValues(pair).merchantText?.trim() || "Unlabelled activity"} · {effectLabel(pair, currency)} · {humanDate(pair)}</p><p className="transaction-detail-note">Both notices count separately until you decide.</p>{[record, pair].map(item => <div key={item.id} className="transaction-comparison"><SourceNotices record={item} /><small>Matching evidence: {item.relationships.flatMap(rel => rel.reasons ?? []).map(reason => reason.replaceAll("_", " ")).join(", ") || "See the paired notice"}</small></div>)}<div className="transaction-buttons"><button type="button" disabled={!ownerId || dirty} onClick={() => decideDuplicate("same")} className="transaction-button transaction-button-primary">Same transaction</button><button type="button" disabled={!ownerId || dirty} onClick={() => decideDuplicate("separate")} className="transaction-button">Keep as separate</button></div></details>}

      {evidence.length > 1 && <details className="transaction-detail-section"><summary>{evidence.length} linked notices · counted once</summary>{evidence.map(item => <div key={item.id} className="transaction-comparison"><p><b>{item.id === retainedRecord.id ? "Retained transaction" : "Linked evidence"}</b> · {humanDate(item)}</p><SourceNotices record={item} /></div>)}<button type="button" disabled={dirty} onClick={() => { const child = evidence.find(item => item.id !== retainedRecord.id); if (child) undoDuplicate(child.id); }} className="transaction-button"><RotateCcw size={14} /> Undo duplicate decision</button></details>}
      {separateOwner && <section className="transaction-detail-section"><h3>Notices kept separate</h3><p>You decided these were separate transactions. Each has its own effect.</p><button type="button" disabled={dirty} onClick={() => undoDuplicate(separateOwner.id)} className="transaction-button"><RotateCcw size={14} /> Undo duplicate decision</button></section>}

      <details className="transaction-detail-section"><summary>Original source and history</summary><SourceNotices record={record} />{record.actionHistory?.length ? <ol className="transaction-history">{record.actionHistory.map(action => <li key={action.id}><b>{action.kind.replaceAll("_", " ")}</b><p>{action.detail.split("; before ")[0]}</p><details><summary>Full action details</summary><p>{action.detail}</p></details></li>)}</ol> : <p className="transaction-detail-note">No review decisions yet. Original source details stay available after edits.</p>}</details>
    </div>
  </dialog>;
}

interface EditorProps {
  record: TransactionLifecycle;
  records: TransactionLifecycle[];
  wallets: Array<{ key: string; label: string }>;
  allowConfirm: boolean;
  onSave: (overrides: Overrides, confirmAfterSave: boolean, evidenceReviewed: boolean) => void;
  undo: (field: keyof Overrides) => void;
  onDirtyChange: (dirty: boolean) => void;
}

function parseAmount(amount: string, currency: string): { value?: number; error?: string } {
  const text = amount.trim();
  if (!text) return { error: "Enter an amount greater than zero." };
  if (!/^\d+(?:\.\d+)?$/.test(text)) return { error: "Use a positive number, such as 12.50." };
  const precision = currency === "JPY" ? 0 : 2;
  if ((text.split(".")[1]?.length ?? 0) > precision) return { error: precision ? "Use no more than two decimal places." : "JPY uses whole amounts without decimal places." };
  const [whole, fraction = ""] = text.split(".");
  const value = Number(whole) * (precision ? 100 : 1) + (precision ? Number(fraction.padEnd(2, "0")) : 0);
  if (!Number.isSafeInteger(value) || value <= 0) return { error: "Enter an amount greater than zero within the supported range." };
  return { value };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function Editor({ record, records, wallets, allowConfirm, onSave, undo, onDirtyChange }: EditorProps) {
  const value = effectiveValues(record);
  const initialAmount = value.amountMinor === undefined ? "" : String(value.amountMinor / (value.currency === "JPY" ? 1 : 100));
  const initialCurrency = value.currency ?? "";
  const initialKind = value.eventType === "generic_expense" ? "purchase" : value.eventType;
  const initialMerchant = value.merchantText ?? "";
  const initialDate = groupingDate(record).value?.slice(0, 10) ?? "";
  const initialWallet = record.userOverrides.walletId ?? "";
  const initialWalletChoice = initialWallet.startsWith("manual:") ? "__new" : initialWallet;
  const initialWalletName = initialWallet.startsWith("manual:") ? record.userOverrides.walletLabel ?? "" : "";
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState(initialCurrency);
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [merchant, setMerchant] = useState(initialMerchant);
  const [date, setDate] = useState(initialDate);
  const [walletChoice, setWalletChoice] = useState(initialWalletChoice);
  const [walletName, setWalletName] = useState(initialWalletName);
  const [currencyReviewed, setCurrencyReviewed] = useState(false);
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const pending = record.confirmationState === "needs_confirmation";
  const amountNeedsDecision = value.amountMinor === undefined;
  const currencyNeedsDecision = !value.currency || value.currencyBasis === "assumed_default";
  const typeNeedsDecision = value.eventType === "unknown";
  const walletNeedsDecision = sourceIdentityConflict(record) && !record.userOverrides.walletLabel;
  const isDirty = amount !== initialAmount || currency !== initialCurrency || kind !== initialKind || merchant !== initialMerchant || date !== initialDate || walletChoice !== initialWalletChoice || walletName !== initialWalletName || currencyReviewed || evidenceReviewed;
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const amountResult = parseAmount(amount, currency);
  const amountChanged = amount !== initialAmount || (currency !== initialCurrency && amountResult.value !== value.amountMinor);
  const walletChanged = walletChoice !== initialWalletChoice || (walletChoice === "__new" && walletName !== initialWalletName);
  const errors: Partial<Record<"amount" | "currency" | "date" | "wallet", string>> = {};
  if (amountChanged && (amount || value.amountMinor !== undefined) && amountResult.error) errors.amount = amountResult.error;
  if (amount !== initialAmount && !amount) errors.amount = "The amount cannot be cleared. Undo a correction to return to the source value.";
  if (currency !== initialCurrency && !currency) errors.currency = "Choose a currency. Use Undo currency to return to the source value.";
  if (date !== initialDate && !validDate(date)) errors.date = "Choose a valid date. Use Undo date to return to the source date.";
  if (walletChoice === "__new" && !walletName.trim()) errors.wallet = "Name this wallet before saving.";
  if (walletChoice && walletChoice !== "__new" && !wallets.some(item => item.key === walletChoice)) errors.wallet = "Choose an available wallet.";

  const overrides: Overrides = {};
  if (amountChanged && amountResult.value !== undefined) overrides.amountMinor = amountResult.value;
  if ((currency !== initialCurrency || (currencyNeedsDecision && currencyReviewed) || (evidenceReviewed && record.evidenceConflict && currency)) && currency) overrides.currency = currency;
  if (kind !== initialKind) overrides.eventType = kind;
  if (merchant !== initialMerchant) overrides.merchantLabel = merchant.trim();
  if (date !== initialDate && validDate(date)) overrides.occurredAt = date;
  if (walletChanged) {
    if (walletChoice === "__new" && walletName.trim()) { overrides.walletId = `manual:${walletName.trim().toLowerCase()}`; overrides.walletLabel = walletName.trim(); }
    else if (walletChoice) { const selected = wallets.find(item => item.key === walletChoice); if (selected) { overrides.walletId = selected.key; overrides.walletLabel = selected.label; } }
    else { overrides.walletId = undefined; overrides.walletLabel = undefined; }
  }
  const hasErrors = Object.keys(errors).length > 0;
  const proposed: TransactionLifecycle = { ...record, userOverrides: { ...record.userOverrides, ...overrides }, evidenceConflict: evidenceReviewed ? undefined : record.evidenceConflict };
  const canSave = isDirty && !hasErrors && (Object.keys(overrides).length > 0 || evidenceReviewed);
  const canSaveAndConfirm = canSave && allowConfirm && readyToConfirm(proposed, records.map(item => item.id === record.id ? proposed : item));
  const fieldClass = (needsDecision: boolean) => `transaction-field${needsDecision ? " transaction-field-attention" : ""}`;
  const error = (field: keyof typeof errors) => errors[field] && <span id={`transaction-${field}-error`} className="transaction-field-error">{errors[field]}</span>;
  const save = (confirmAfterSave: boolean) => { if (canSave && (!confirmAfterSave || canSaveAndConfirm)) onSave(overrides, confirmAfterSave, evidenceReviewed); };
  const discardEdits = (form: HTMLFormElement | null) => { setAmount(initialAmount); setCurrency(initialCurrency); setKind(initialKind); setMerchant(initialMerchant); setDate(initialDate); setWalletChoice(initialWalletChoice); setWalletName(initialWalletName); setCurrencyReviewed(false); setEvidenceReviewed(false); requestAnimationFrame(() => form?.querySelector<HTMLInputElement>("input")?.focus()); };
  const undoLabels = { amountMinor: "amount", currency: "currency", eventType: "type", merchantLabel: "description", occurredAt: "date", walletLabel: "wallet assignment" } as const;

  return <form className="transaction-editor" noValidate onSubmit={event => { event.preventDefault(); save(pending && allowConfirm && canSaveAndConfirm); }}>
    <h3>Review or correct</h3><p className="transaction-detail-note">Highlighted details need a decision. Your corrections keep the original source intact.</p>
    <div className="transaction-editor-grid">
      <label className={fieldClass(amountNeedsDecision)}>Amount<input aria-label="Corrected amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} aria-invalid={!!errors.amount} aria-describedby={errors.amount ? "transaction-amount-error" : "transaction-amount-hint"} /><small id="transaction-amount-hint">{currency === "JPY" ? "Whole JPY amounts" : "Positive amount, up to two decimals"}</small>{error("amount")}</label>
      <div className={fieldClass(currencyNeedsDecision)}><label>Currency<select aria-label="Corrected currency" value={currency} onChange={event => { setCurrency(event.target.value); setCurrencyReviewed(true); }} aria-invalid={!!errors.currency} aria-describedby={errors.currency ? "transaction-currency-error" : undefined}><option value="">Choose currency</option>{SUPPORTED_REPORTING_CURRENCIES.map(item => <option key={item}>{item}</option>)}</select></label>{value.currencyBasis === "assumed_default" && <label className="transaction-checkbox"><input type="checkbox" checked={currencyReviewed} onChange={event => setCurrencyReviewed(event.target.checked)} /><span>I checked that {currency || "this currency"} is correct</span></label>}{error("currency")}</div>
      <label className={fieldClass(typeNeedsDecision)}>Type<select aria-label="Corrected type" value={kind} onChange={event => setKind(event.target.value as TransactionKind)}><option value="unknown">Choose type</option><option value="purchase">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="reversal">Reversal</option><option value="transfer">Transfer between accounts</option><option value="withdrawal">Cash withdrawal · neutral</option></select></label>
      <label className={fieldClass(false)}>Description<input aria-label="Corrected description" value={merchant} maxLength={120} onChange={event => setMerchant(event.target.value)} /></label>
      <label className={fieldClass(false)}>Date<input aria-label="Corrected date" type="date" value={date} onInput={event => setDate(event.currentTarget.value)} onChange={event => setDate(event.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? "transaction-date-error" : "transaction-date-hint"} /><small id="transaction-date-hint">A correction changes the grouping date.</small>{error("date")}</label>
      <label className={fieldClass(walletNeedsDecision)}>Wallet assignment<select aria-label="Wallet assignment" value={walletChoice} onChange={event => setWalletChoice(event.target.value)} aria-invalid={!!errors.wallet} aria-describedby={errors.wallet ? "transaction-wallet-error" : undefined}><option value="">Use source details / unidentified</option>{wallets.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}<option value="__new">Name a wallet yourself</option></select>{walletChoice !== "__new" && error("wallet")}</label>
      {walletChoice === "__new" && <label className={fieldClass(walletNeedsDecision)}>Wallet name<input aria-label="Wallet name" value={walletName} maxLength={60} onChange={event => setWalletName(event.target.value)} placeholder="e.g. Everyday account" aria-invalid={!!errors.wallet} aria-describedby={errors.wallet ? "transaction-wallet-error" : undefined} />{error("wallet")}</label>}
    </div>
    {record.evidenceConflict && <label className="transaction-checkbox transaction-evidence-check"><input type="checkbox" checked={evidenceReviewed} onChange={event => setEvidenceReviewed(event.target.checked)} /><span>I compared the later source evidence and reviewed the values above.</span></label>}
    {hasErrors && <p role="alert" className="transaction-action-error">Correct the indicated fields before saving.</p>}
    <div className="transaction-buttons"><button type="button" disabled={!canSave} onClick={() => save(false)} className="transaction-button">Save changes</button>{pending && allowConfirm && <button type="submit" disabled={!canSaveAndConfirm} className="transaction-button transaction-button-primary">{["transfer", "withdrawal"].includes(kind) ? "Save and confirm as neutral" : "Save and confirm"}</button>}{isDirty && <button type="button" onClick={event => discardEdits(event.currentTarget.form)} className="transaction-button transaction-button-quiet">Discard edits</button>}</div>
    {isDirty && !hasErrors && !canSaveAndConfirm && pending && <p className="transaction-detail-note">You can save corrections now. Resolve all highlighted details and possible duplicates before confirming.</p>}
    {Object.entries(undoLabels).some(([field]) => record.userOverrides[field as keyof Overrides] !== undefined) && <div className="transaction-undo-fields"><span>Return a field to its source value:</span><div className="transaction-buttons">{(Object.keys(undoLabels) as Array<keyof typeof undoLabels>).filter(field => record.userOverrides[field] !== undefined).map(field => <button key={field} type="button" disabled={isDirty} onClick={() => undo(field)} className="transaction-button transaction-button-quiet"><RotateCcw size={12} /> Undo {undoLabels[field]}</button>)}</div></div>}
  </form>;
}
