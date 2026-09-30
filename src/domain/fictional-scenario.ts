import type { CanonicalCapture } from "./canonical-capture";
import type { TransactionKind } from "./transaction-candidate";
import { createTransactionParser } from "../parser/transaction-parser.ts";
import { TransactionLifecycleStore, calculateCalendarWeekMetrics, confirm, effectiveValues, groupingDate, type TransactionLifecycle } from "./transaction-lifecycle.ts";
import { isReplaySuppressed, sourceIdentityFor, type ReviewSnapshot } from "./review-persistence.ts";

export interface CaptureTrace { order: number; id: string; capture: CanonicalCapture; outcome: "candidate" | "incomplete" | "rejected" | "suppressed"; reason: string; eventId?: string; lifecycle?: string; matchEvidence?: string[]; evidence?: string[] }
export interface ScenarioState extends ReviewSnapshot { traces: CaptureTrace[]; defaultCurrency?: string }
export const EMPTY_SCENARIO: ScenarioState = { version: 1, records: [], deletedSourceIdentities: [], sourceCurrencyRules: [], traces: [] };
const parser = createTransactionParser({ now: () => new Date("2026-09-30T00:00:00.000Z") });
const history = (record: TransactionLifecycle, kind: NonNullable<TransactionLifecycle["actionHistory"]>[number]["kind"], detail: string): TransactionLifecycle => ({ ...record, actionHistory: [...(record.actionHistory ?? []), { id: `${record.id}:${(record.actionHistory ?? []).length + 1}`, at: "fictional demo action", kind, detail }] });
export function processCapture(state: ScenarioState, id: string, capture: CanonicalCapture): ScenarioState {
  const order = state.traces.length + 1;
  if (isReplaySuppressed(state, capture)) return { ...state, traces: [...state.traces, { order, id, capture, outcome: "suppressed", reason: "Deleted source identity remains suppressed" }] };
  const candidate = parser.parse(capture);
  if (!candidate) return { ...state, traces: [...state.traces, { order, id, capture, outcome: "rejected", reason: "No supported financial event signal" }] };
  if (candidate.status === "incomplete" && candidate.sourceFacts.amountMinor === undefined) {
    return { ...state, traces: [...state.traces, { order, id, capture, outcome: "incomplete", reason: "Ignored in activity because no amount was found", evidence: candidate.sourceFacts.evidence.map(e => `${e.field}: ${e.excerpt}`) }] };
  }
  const store = new TransactionLifecycleStore(state.records);
  const before = store.records();
  const existing = before.find(record => record.sourceProvenance.some(p => p.sourceIdentity === sourceIdentityFor(capture)));
  const record = store.upsert(candidate, capture);
  const lifecycle = existing ? (existing.sourceCandidates.some(c => c.captureId === candidate.captureId) ? "exact source replay" : "same source identity, new evidence") : before.some(r => r.id === record.id) ? (record.interpretation.settlementState === "finalized" ? "referenced finalized update or exact cross-source merge" : "exact cross-source merge") : record.relationships.some(r => r.kind === "possible_duplicate_of") ? "possible duplicate, both counted" : "new event";
  const matchEvidence = existing ? [`same source identity ${sourceIdentityFor(capture)}`] : before.some(r=>r.id===record.id) ? capture.metadata.transactionReference ? [`shared explicit reference ${capture.metadata.transactionReference}`,`previous amount ${before.find(r=>r.id===record.id)?.interpretation.amountMinor??"missing"}`,`new amount ${candidate.sourceFacts.amountMinor??"missing"}`] : [`same exact source timestamp ${candidate.sourceFacts.occurredAt}`,`same amount ${candidate.sourceFacts.amountMinor}`,`same currency ${candidate.sourceFacts.currency}`,`same kind ${candidate.sourceFacts.kind}`,`same normalized merchant ${candidate.sourceFacts.merchantText}`] : record.relationships.find(r=>r.kind==="possible_duplicate_of")?.reasons??[];
  return { ...state, records: store.records(), traces: [...state.traces, { order, id, capture, outcome: candidate.status === "incomplete" ? "incomplete" : "candidate", reason: candidate.status === "incomplete" ? "Financial signal, amount missing" : "Source facts extracted", eventId: record.id, lifecycle, matchEvidence, evidence: candidate.sourceFacts.evidence.map(e => `${e.field}: ${e.excerpt}`) }] };
}
export function changeRecord(state: ScenarioState, id: string, kind: NonNullable<TransactionLifecycle["actionHistory"]>[number]["kind"], detail: string, fn: (r: TransactionLifecycle) => TransactionLifecycle): ScenarioState {
  return { ...state, records: state.records.map(r => { if(r.id!==id)return r; const after=fn(r); const touched=[...new Set([...weeks([r]),...weeks([after])])]; const deltas=touched.flatMap(w=>[...new Set([effectiveValues(r).currency,effectiveValues(after).currency].filter((v):v is string=>!!v))].map(c=>{const old=calculateCalendarWeekMetrics([r],w).byCurrency.find(x=>x.currency===c)?.detectedNetFlowMinor??0;const next=calculateCalendarWeekMetrics([after],w).byCurrency.find(x=>x.currency===c)?.detectedNetFlowMinor??0;return `${w} ${c} ${old} → ${next} minor units`;})).join("; ");return history(after,kind,`${detail}; before ${JSON.stringify(effectiveValues(r))}; after ${JSON.stringify(effectiveValues(after))}; weekly effect ${deltas||"none"}`) }) };
}
export function sourceProfile(record: TransactionLifecycle): string { const p=record.sourceProvenance[0]; return `${p.provider??p.sourceType}:${p.paymentInstrumentReference??"no-instrument"}`; }
export function currencyChoice(state: ScenarioState, record: TransactionLifecycle): { currency?: string; basis: "source_profile_rule" | "chosen_app_default" } { const rule=state.sourceCurrencyRules.find(r=>r.profile===sourceProfile(record)); return rule?{currency:rule.currency,basis:"source_profile_rule"}:{currency:state.defaultCurrency,basis:"chosen_app_default"}; }
export function confirmRecord(state: ScenarioState, id: string): ScenarioState { return changeRecord(state, id, "confirmed", "Person accepted displayed movement and applicable defaults", r => {const choice=currencyChoice(state,r);return confirm(r,choice.currency,choice.basis)}); }
export function undoConfirmation(state: ScenarioState, id: string): ScenarioState { return changeRecord(state, id, "confirmation_undone", "Person returned the transaction to review", r => ({ ...r, confirmationState: "needs_confirmation" })); }
export function duplicateDecision(state: ScenarioState, id: string, choice: "same" | "separate" | "undo"): ScenarioState {
  return changeRecord(state, id, "duplicate_decision", `Duplicate choice ${choice}`, r => ({ ...r, relationships: r.relationships.map(rel => rel.kind === "possible_duplicate_of" || rel.kind === "duplicate_of" || rel.kind === "separate_from" ? { ...rel, kind: choice === "same" ? "duplicate_of" as const : choice === "separate" ? "separate_from" as const : "possible_duplicate_of" as const } : rel) }));
}
export function weeks(records: TransactionLifecycle[]): string[] { return [...new Set(records.map(r => { const d = groupingDate(r).value; if (!d) return undefined; const date = new Date(d.length === 10 ? `${d}T00:00:00Z` : d); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return date.toISOString().slice(0,10); }).filter((v):v is string=>!!v))].sort(); }
export function eventEffect(r: TransactionLifecycle, week: string, currency: string): { reason: string; inflow: number; outflow: number; provisional: number; pending: boolean } {
  const d=groupingDate(r).value, v=effectiveValues(r);
  const inWeek=!!d && new Date(d.length===10?`${d}T00:00:00Z`:d).getTime() >= new Date(`${week}T00:00:00Z`).getTime() && new Date(d.length===10?`${d}T00:00:00Z`:d).getTime()<new Date(`${week}T00:00:00Z`).getTime()+604800000;
  if (!inWeek) return { reason:"outside week", inflow:0,outflow:0,provisional:0,pending:false };
  if (r.disposition==="excluded" || r.relationships.some(x=>x.kind==="duplicate_of")) return { reason:r.disposition==="excluded"?"excluded":"suppressed duplicate",inflow:0,outflow:0,provisional:0,pending:false };
  if (v.currency!==currency) return { reason:v.currency?`outside currency (${v.currency})`:"no usable currency",inflow:0,outflow:0,provisional:0,pending:false };
  if (v.amountMinor===undefined) return { reason:"amount missing",inflow:0,outflow:0,provisional:0,pending:false };
  const m=calculateCalendarWeekMetrics([r],week).byCurrency.find(x=>x.currency===currency);
  return { reason:`${v.eventType}; ${r.confirmationState}; ${groupingDate(r).basis}`,inflow:m?.detectedInflowMinor??0,outflow:m?.detectedOutflowMinor??0,provisional:m?.provisionalOutflowMinor??0,pending:r.confirmationState==="needs_confirmation" };
}
export function bulkPreview(state: ScenarioState, ids: string[], week: string, currency: string) {
  const before=calculateCalendarWeekMetrics(state.records,week).byCurrency.find(x=>x.currency===currency);
  const afterRecords=state.records.map(r=>ids.includes(r.id)?confirm(r,currencyChoice(state,r).currency,currencyChoice(state,r).basis):r);
  const after=calculateCalendarWeekMetrics(afterRecords,week).byCurrency.find(x=>x.currency===currency);
  return { count:ids.length, before:before?.detectedNetFlowMinor??0, after:after?.detectedNetFlowMinor??0, delta:(after?.detectedNetFlowMinor??0)-(before?.detectedNetFlowMinor??0) };
}
export function sourceConflict(state: ScenarioState, id: string, fields: { currency?: string; eventType?: TransactionKind }): ScenarioState {
  return changeRecord(state,id,"edited","Later metadata supplied for comparison",r=>({ ...r, interpretation:{...r.interpretation,...fields}, confirmationState:"needs_confirmation", evidenceConflict:[fields.currency && r.acceptedDefaults?.currency && fields.currency!==r.acceptedDefaults.currency?`Accepted ${r.acceptedDefaults.currency}; later ${fields.currency}`:"",fields.eventType && r.acceptedDefaults?.eventType && fields.eventType!=="unknown"?`Accepted generic expense; later ${fields.eventType}`:""].filter(Boolean).join("; ")||undefined }));
}
