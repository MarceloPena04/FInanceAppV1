import assert from "node:assert/strict";
import test from "node:test";
import { loadDefaultFixtureDocument } from "../../src/fixtures/loader.ts";
import { EMPTY_SCENARIO, changeRecord, duplicateDecision, processCapture } from "../../src/domain/fictional-scenario.ts";
import { clearUserOverrides, effectiveValues } from "../../src/domain/transaction-lifecycle.ts";
import { REPORTING_RATE_VERSION, SUPPORTED_REPORTING_CURRENCIES, calculateReportingMetrics, convertMinor } from "../../src/domain/reporting-currency.ts";

const fixtures=loadDefaultFixtureDocument().records;
const add=(state,id)=>{const item=fixtures.find(entry=>entry.id===id);assert.ok(item,id);return processCapture(state,id,item.capture)};
const get=(state,id)=>state.records.find(record=>record.sourceCandidates.some(candidate=>candidate.captureId===fixtures.find(item=>item.id===id)?.capture.captureId));

test("every fixture currency converts deterministically to every reporting currency without changing source values",()=>{
 const samples={EUR:1299,USD:2000,MXN:18900,JPY:1200};
 for(const [source,amount] of Object.entries(samples)) for(const target of SUPPORTED_REPORTING_CURRENCIES){const a=convertMinor(amount,source,target);const b=convertMinor(amount,source,target);assert.deepEqual(a,b);assert.equal(a.version,REPORTING_RATE_VERSION);assert.equal(a.sourceAmountMinor,amount);assert.equal(a.sourceCurrency,source)}
 assert.equal(convertMinor(2000,"USD","EUR").reportingAmountMinor,1840);
 assert.equal(convertMinor(1200,"JPY","EUR").reportingAmountMinor,720);
 assert.equal(convertMinor(1,"JPY","USD").reportingAmountMinor,1,"JPY conversion rounds into USD cents");
 assert.equal(convertMinor(1,"EUR","JPY").reportingAmountMinor,2,"EUR cents round into zero-decimal JPY");
});

test("reporting currency recomputes all-time and weekly totals including foreign pending events",()=>{
 let state=["refund-eur","referenced-finalized-usd","income-push-mxn","purchase-jpy-email"].reduce(add,EMPTY_SCENARIO);
 const eur=calculateReportingMetrics(state.records,"EUR");
 assert.equal(eur.inflowMinor,1840+4750);assert.equal(eur.outflowMinor,1955+720);assert.equal(eur.pendingCount,4);assert.equal(eur.pendingAmountMinor,1840+4750+1955+720);
 const usd=calculateReportingMetrics(state.records,"USD");assert.notEqual(usd.netFlowMinor,eur.netFlowMinor);
 const week=calculateReportingMetrics(state.records,"EUR","2026-09-28");assert.equal(week.outflowMinor,1955);assert.equal(week.inflowMinor,0);
});

test("conversion follows corrections, exclusions, duplicate decisions and undo",()=>{
 let state=["exact-cross-source-email","exact-cross-source-push","sparse-cross-source-email","sparse-cross-source-push"].reduce(add,EMPTY_SCENARIO);
 assert.equal(calculateReportingMetrics(state.records,"USD").outflowMinor,2228);
 const exact=get(state,"exact-cross-source-email"), sparse=get(state,"sparse-cross-source-push");
 const originalFacts=structuredClone(exact.sourceCandidates[0].sourceFacts);
 state=changeRecord(state,exact.id,"edited","correct",r=>({...r,userOverrides:{...r.userOverrides,amountMinor:900}}));assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,2100);
 assert.deepEqual(get(state,"exact-cross-source-email").sourceCandidates[0].sourceFacts,originalFacts);
 state=changeRecord(state,exact.id,"edited","undo",r=>clearUserOverrides(r,["amountMinor"]));assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,2050);
 state=duplicateDecision(state,sparse.id,"same");assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,1450);
 state=duplicateDecision(state,sparse.id,"undo");assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,2050);
 state=changeRecord(state,exact.id,"excluded","exclude",r=>({...r,disposition:"excluded"}));assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,1200);
 state=changeRecord(state,exact.id,"restored","restore",r=>({...r,disposition:"active"}));assert.equal(calculateReportingMetrics(state.records,"EUR").outflowMinor,2050);
 assert.equal(effectiveValues(get(state,"exact-cross-source-email")).currency,"EUR");
});

test("unique captures and economic events stay distinct from replay attempts; activity sorts newest first",()=>{
 let state=["normal-purchase-email-eur","purchase-without-captured-at","normal-purchase-email-eur"].reduce(add,EMPTY_SCENARIO);
 assert.equal(state.traces.length,3);assert.equal(new Set(state.traces.map(trace=>trace.capture.captureId)).size,2);assert.equal(state.records.length,2);
 const ordered=[...state.records].sort((a,b)=>{const av=a.interpretation.occurredAt??a.sourceCandidates[0].capturedAt??a.sourceCandidates[0].processedAt;const bv=b.interpretation.occurredAt??b.sourceCandidates[0].capturedAt??b.sourceCandidates[0].processedAt;return new Date(bv).getTime()-new Date(av).getTime()});
 assert.equal(ordered[0].sourceCandidates[0].captureId,"capture-029","first-seen time is the final date fallback");
});
