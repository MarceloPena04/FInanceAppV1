import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefaultFixtureDocument } from '../../src/fixtures/loader.ts';
import { EMPTY_SCENARIO, processCapture, confirmRecord, undoConfirmation, changeRecord, duplicateDecision, eventEffect, bulkPreview, sourceProfile } from '../../src/domain/fictional-scenario.ts';
import { calculateCalendarWeekMetrics, clearUserOverrides, effectiveValues } from '../../src/domain/transaction-lifecycle.ts';
import { removeEventPermanently } from '../../src/domain/review-persistence.ts';
const data=loadDefaultFixtureDocument().records;
const entry=id=>{const v=data.find(x=>x.id===id);assert.ok(v,id);return v};
const add=(s,id)=>{const f=entry(id);return processCapture(s,id,f.capture)};
const week=(s,w,c)=>calculateCalendarWeekMetrics(s.records,w).byCurrency.find(x=>x.currency===c)?.detectedNetFlowMinor??0;
const get=(s,id)=>s.records.find(r=>r.sourceCandidates.some(c=>c.captureId===entry(id).capture.captureId));
const focused=['missing-merchant','payment-without-currency','exact-cross-source-email','exact-cross-source-push','sparse-cross-source-email','sparse-cross-source-push','duplicate-source-original','duplicate-source-replay','referenced-pending-usd','referenced-finalized-usd','unlinked-pending-usd','unlinked-finalized-usd','refund-eur','transfer-eur','missing-amount','unsupported-bank-service-notice'];
test('independent focused ledger: parser outcomes, merges, unresolved pairs and weekly totals',()=>{
 let s=focused.reduce(add,EMPTY_SCENARIO);
 assert.deepEqual(Object.fromEntries(['candidate','incomplete','rejected'].map(k=>[k,s.traces.filter(t=>t.outcome===k).length])),{candidate:14,incomplete:1,rejected:1});
 assert.equal(s.records.length,11);assert.equal(week(s,'2026-09-28','EUR'),-2050);assert.equal(week(s,'2026-09-28','USD'),-4125);
 assert.equal(get(s,'exact-cross-source-email').id,get(s,'exact-cross-source-push').id);
 assert.equal(get(s,'duplicate-source-original').id,get(s,'duplicate-source-replay').id);
 assert.equal(get(s,'referenced-pending-usd').id,get(s,'referenced-finalized-usd').id);
 assert.notEqual(get(s,'sparse-cross-source-email').id,get(s,'sparse-cross-source-push').id);
 assert.notEqual(get(s,'unlinked-pending-usd').id,get(s,'unlinked-finalized-usd').id);
 assert.equal(get(s,'sparse-cross-source-push').relationships[0].kind,'possible_duplicate_of');
 assert.equal(get(s,'missing-amount'),undefined);assert.match(s.traces.find(t=>t.id==='missing-amount').reason,/no amount/);
 assert.equal(s.traces.at(-1).outcome,'rejected');
});
test('accepted defaults remain user decisions, conflict holds prior impact and requires review',()=>{
 let s={...EMPTY_SCENARIO,defaultCurrency:'EUR'};s=add(add(s,'missing-merchant'),'payment-without-currency');
 assert.equal(week(s,'2026-09-21','USD'),0);assert.equal(eventEffect(get(s,'missing-merchant'),'2026-09-21','USD').provisional,0);
 assert.equal(week(s,'2026-08-31','EUR'),0);
 s=confirmRecord(s,get(s,'missing-merchant').id);assert.equal(get(s,'missing-merchant').confirmationState,'needs_confirmation');s=changeRecord(s,get(s,'missing-merchant').id,'edited','Explicit expense',r=>({...r,userOverrides:{...r.userOverrides,eventType:'generic_expense'}}));s=confirmRecord(s,get(s,'missing-merchant').id);s=changeRecord(s,get(s,'payment-without-currency').id,'edited','Explicit expense',r=>({...r,userOverrides:{...r.userOverrides,eventType:'generic_expense',currency:'EUR'}}));s=confirmRecord(s,get(s,'payment-without-currency').id);
 assert.equal(week(s,'2026-09-21','USD'),-850);assert.equal(week(s,'2026-08-31','EUR'),-1750);
 const r=get(s,'payment-without-currency');assert.equal(r.sourceCandidates[0].sourceFacts.currency,undefined);assert.equal(r.sourceCandidates[0].sourceFacts.kind,'unknown');assert.equal(r.userOverrides.currency,'EUR');
 const capture={...entry('payment-without-currency').capture,captureId:'capture-028-later',rawText:'Refund issued: USD 17.50 from Example Cafe on 2026-09-04.'};
 s=processCapture(s,'later-refund',capture);assert.equal(get(s,'payment-without-currency').confirmationState,'needs_confirmation');assert.equal(get(s,'payment-without-currency').sourceCandidates.length,2);assert.equal(week(s,'2026-08-31','EUR'),-1750);
 assert.equal(get(s,'payment-without-currency').sourceCandidates.length,2);
 s=add(s,'payment-without-currency');assert.equal(get(s,'payment-without-currency').sourceCandidates.length,2);assert.equal(week(s,'2026-08-31','EUR'),-1750);
 s=changeRecord(s,r.id,'edited','Accept new source reading',x=>({...x,evidenceConflict:undefined,acceptedDefaults:undefined}));
 assert.equal(week(s,'2026-08-31','EUR'),-1750);assert.equal(week(s,'2026-08-31','USD'),0);
});
test('explicit edit and source currency outrank opt-in source rule; rule outranks chosen app default',()=>{
 let s={...EMPTY_SCENARIO,defaultCurrency:'EUR'};s=add(s,'payment-without-currency');const id=get(s,'payment-without-currency').id;
 s={...s,sourceCurrencyRules:[{profile:sourceProfile(get(s,'payment-without-currency')),currency:'USD'}]};s=changeRecord(s,id,'edited','Explicit expense and currency',r=>({...r,userOverrides:{...r.userOverrides,eventType:'generic_expense',currency:'USD'}}));s=confirmRecord(s,id);
 assert.equal(get(s,'payment-without-currency').userOverrides.currency,'USD');assert.equal(week(s,'2026-08-31','USD'),-1750);
 s=changeRecord(s,id,'edited','user currency',r=>({...r,userOverrides:{...r.userOverrides,currency:'MXN'}}));assert.equal(week(s,'2026-08-31','MXN'),-1750);
 s=add(EMPTY_SCENARIO,'normal-purchase-email-eur');const known=get(s,'normal-purchase-email-eur');s={...s,defaultCurrency:'USD',sourceCurrencyRules:[{profile:sourceProfile(known),currency:'MXN'}]};s=confirmRecord(s,known.id);assert.equal(effectiveValues(get(s,'normal-purchase-email-eur')).currency,'EUR');
});
test('correction, undo, exclusion, duplicate reversals, delete and replay have intermediate money effects',()=>{
 let s=['exact-cross-source-email','exact-cross-source-push','sparse-cross-source-email','sparse-cross-source-push'].reduce(add,EMPTY_SCENARIO);
 const exact=get(s,'exact-cross-source-email').id,sparse=get(s,'sparse-cross-source-push').id;
 assert.equal(week(s,'2026-09-28','EUR'),-2050);
 s=changeRecord(s,exact,'edited','amount correction',r=>({...r,userOverrides:{...r.userOverrides,amountMinor:900}}));assert.equal(week(s,'2026-09-28','EUR'),-2100);
 s=changeRecord(s,exact,'edited','undo',r=>clearUserOverrides(r,['amountMinor']));assert.equal(week(s,'2026-09-28','EUR'),-2050);
 s=duplicateDecision(s,sparse,'same');assert.equal(week(s,'2026-09-28','EUR'),-1450);
 s=duplicateDecision(s,sparse,'undo');assert.equal(week(s,'2026-09-28','EUR'),-2050);
 s=duplicateDecision(s,sparse,'separate');assert.equal(week(s,'2026-09-28','EUR'),-2050);
 s=duplicateDecision(s,sparse,'undo');assert.equal(get(s,'sparse-cross-source-push').relationships[0].kind,'possible_duplicate_of');
 s=changeRecord(s,exact,'excluded','exclude',r=>({...r,disposition:'excluded'}));assert.equal(week(s,'2026-09-28','EUR'),-1200);
 s=changeRecord(s,exact,'restored','restore',r=>({...r,disposition:'active'}));assert.equal(week(s,'2026-09-28','EUR'),-2050);
 s={...s,...removeEventPermanently(s,exact)};assert.equal(week(s,'2026-09-28','EUR'),-1200);
 const refreshed=structuredClone(s);s=add(add(refreshed,'exact-cross-source-email'),'exact-cross-source-push');assert.equal(week(s,'2026-09-28','EUR'),-1200);assert.equal(s.records.length,2);assert.equal(s.traces.at(-1).outcome,'suppressed');
});
test('referenced finalization changes confirmed amount once; bulk preview is exact',()=>{
 let s={...EMPTY_SCENARIO,defaultCurrency:'EUR'};s=add(s,'referenced-pending-usd');assert.equal(week(s,'2026-09-28','USD'),-2000);
 s=confirmRecord(s,get(s,'referenced-pending-usd').id);s=add(s,'referenced-finalized-usd');assert.equal(week(s,'2026-09-28','USD'),-2125);assert.equal(get(s,'referenced-pending-usd').confirmationState,'needs_confirmation');
 s=add(s,'missing-merchant');assert.equal(bulkPreview(s,[get(s,'missing-merchant').id],'2026-09-21','USD').delta,0);
 s=confirmRecord(s,get(s,'missing-merchant').id);assert.equal(week(s,'2026-09-21','USD'),0);
 s=add(s,'missing-amount');assert.equal(get(s,'missing-amount'),undefined);assert.equal(s.traces.at(-1).outcome,'incomplete');
});
test('confirmation can be undone without changing source evidence',()=>{
 let s={...EMPTY_SCENARIO,defaultCurrency:'EUR'};s=add(s,'payment-without-currency');const id=get(s,'payment-without-currency').id;
 s=confirmRecord(s,id);assert.equal(get(s,'payment-without-currency').confirmationState,'needs_confirmation');s=changeRecord(s,id,'edited','Explicit income',r=>({...r,userOverrides:{...r.userOverrides,eventType:'income',currency:'EUR'}}));s=confirmRecord(s,id);assert.equal(get(s,'payment-without-currency').confirmationState,'confirmed');
 s=undoConfirmation(s,id);assert.equal(get(s,'payment-without-currency').confirmationState,'needs_confirmation');assert.equal(get(s,'payment-without-currency').sourceCandidates[0].sourceFacts.currency,undefined);assert.equal(get(s,'payment-without-currency').actionHistory.at(-1).kind,'confirmation_undone');
});
test('all committed captures pass through one parser path with inspectable outcomes',()=>{
 const s=data.reduce((a,f)=>processCapture(a,f.id,f.capture),EMPTY_SCENARIO);
 assert.equal(s.traces.length,38);assert.equal(s.traces.filter(t=>t.outcome==='candidate').length+s.traces.filter(t=>t.outcome==='incomplete').length+s.traces.filter(t=>t.outcome==='rejected').length,38);
 console.log('FULL_FIXTURE_OUTCOMES',JSON.stringify(Object.fromEntries(['candidate','incomplete','rejected'].map(k=>[k,s.traces.filter(t=>t.outcome===k).length]))));
});
