import assert from "node:assert/strict";
import test from "node:test";
import { loadDefaultFixtureDocument } from "../../src/fixtures/loader.ts";
import { createTransactionParser } from "../../src/parser/transaction-parser.ts";
import { EMPTY_SCENARIO, changeRecord, confirmRecord, duplicateDecision, processCapture } from "../../src/domain/fictional-scenario.ts";
import { clearUserOverrides, sourceIdentityConflict } from "../../src/domain/transaction-lifecycle.ts";
import { attentionReasons, confirmReady, reviewQueue, visibleActivity } from "../../src/domain/review-queue.ts";
import { calculateReportingMetrics } from "../../src/domain/reporting-currency.ts";
import { filterActivityRecords, migrateWalletEvidence, sourceScopeOptions, sourceScopedRecords, walletForRecord, walletOptions } from "../../src/domain/wallet-source.ts";

const fixtures = loadDefaultFixtureDocument().records;
const fixture = id => fixtures.find(item => item.id === id).capture;
const add = (state, id) => processCapture(state, id, fixture(id));

test("bank, account, and card are explicit source facts, distinct from the notice provider", () => {
  const parser = createTransactionParser();
  const purchase = parser.parse(fixture("normal-purchase-email-eur"));
  assert.deepEqual(purchase.sourceFacts.fundingSource, { institution: "North Example Bank", account: "••6621", card: "••3434" });
  assert.ok(purchase.sourceFacts.evidence.some(item => item.field === "card" && item.origin === "text" && item.excerpt === "Card ending 3434"));
  assert.ok(purchase.sourceFacts.evidence.some(item => item.field === "account" && item.origin === "metadata"));
  assert.deepEqual(parser.parse(fixture("credit-income-email-usd")).sourceFacts.fundingSource, { institution: "South Example Bank", account: "••7732" });
  assert.deepEqual(parser.parse(fixture("apple-pay-purchase-eur")).sourceFacts.fundingSource, { institution: "North Example Bank", card: "••9088" });
  assert.equal(parser.parse(fixture("missing-merchant")).sourceFacts.fundingSource, undefined);
});

test("the same explicit account groups notices while the specific card remains visible", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "exact-cross-source-email");
  state = add(state, "exact-cross-source-push");
  assert.equal(state.records.length, 1);
  const wallet = walletForRecord(state.records[0]);
  assert.match(wallet.label, /Account ••6621/);
  assert.match(wallet.detail, /Card ••3434/);
  assert.notEqual(wallet.label, "fictional-ledger-app");
  assert.equal(walletOptions(state.records).length, 1);
});

test("different known card identities block automatic cross-source merging", () => {
  const first = fixture("exact-cross-source-email");
  const second = { ...fixture("exact-cross-source-push"), metadata: { ...fixture("exact-cross-source-push").metadata, paymentInstrumentReference: "north-card-9999" } };
  let state = processCapture(EMPTY_SCENARIO, "first", first);
  state = processCapture(state, "second", second);
  assert.equal(state.records.length, 2);
  const textOnly = { ...fixture("exact-cross-source-push"), metadata: { externalId: "push-text-only" }, rawText: fixture("exact-cross-source-push").rawText.replace("Card ending 3434", "Card ending 9999") };
  state = processCapture(processCapture(EMPTY_SCENARIO, "first", { ...first, metadata: { externalId: "mail-text-only" } }), "text-only", textOnly);
  assert.equal(state.records.length, 2);
});

test("text and metadata that name different cards require individual review", () => {
  const original = fixture("normal-purchase-email-eur");
  const conflicting = { ...original, metadata: { ...original.metadata, paymentInstrumentReference: "north-card-9999" } };
  const state = processCapture(EMPTY_SCENARIO, "contradictory-notice", conflicting);
  assert.equal(sourceIdentityConflict(state.records[0]), true);
  assert.equal(walletForRecord(state.records[0]).basis, "conflict");
  assert.ok(attentionReasons(state.records[0], state.records).some(reason => reason.includes("Source account")));
});

test("a referenced identity conflict reopens review and a person can assign, confirm, and undo a wallet", () => {
  let state = add(EMPTY_SCENARIO, "wallet-conflict-email");
  const id = state.records[0].id;
  state = confirmRecord(state, id);
  assert.equal(state.records[0].confirmationState, "confirmed");
  state = add(state, "wallet-conflict-push");
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].confirmationState, "needs_confirmation");
  assert.equal(sourceIdentityConflict(state.records[0]), true);
  assert.equal(walletForRecord(state.records[0]).basis, "conflict");
  assert.ok(attentionReasons(state.records[0], state.records).some(reason => reason.includes("Source account")));
  state = changeRecord(state, id, "edited", "Wallet chosen by person", record => ({ ...record, userOverrides: { ...record.userOverrides, walletId: "manual:everyday", walletLabel: "Everyday" } }));
  state = confirmRecord(state, id);
  assert.equal(state.records[0].confirmationState, "confirmed");
  assert.equal(walletForRecord(state.records[0]).basis, "user");
  state = changeRecord(state, id, "edited", "Undo wallet", record => clearUserOverrides(record, ["walletId", "walletLabel"]));
  assert.equal(walletForRecord(state.records[0]).basis, "conflict");
  assert.equal(state.records[0].sourceCandidates.length, 2);
});

test("migration adds fixture source evidence without changing saved money or review decisions", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "exact-cross-source-email");
  state = add(state, "exact-cross-source-push");
  state = confirmRecord(state, state.records[0].id);
  const before = calculateReportingMetrics(state.records, "EUR").netFlowMinor;
  const old = state.records.map(record => ({ ...record,
    sourceCandidates: record.sourceCandidates.map(candidate => ({ ...candidate, sourceFacts: { ...candidate.sourceFacts, fundingSource: undefined, evidence: candidate.sourceFacts.evidence.filter(item => !["institution", "account", "card"].includes(item.field)) } })),
    sourceProvenance: record.sourceProvenance.map(source => ({ ...source, institutionName: undefined, accountReference: undefined, paymentInstrumentReference: undefined })),
  }));
  const restored = migrateWalletEvidence(old, fixtures.map(item => item.capture));
  assert.equal(restored[0].confirmationState, "confirmed");
  assert.equal(restored[0].sourceCandidates.length, 2);
  assert.equal(restored[0].sourceCandidates[0].sourceFacts.fundingSource.account, "••6621");
  assert.equal(calculateReportingMetrics(restored, "EUR").netFlowMinor, before);
  assert.equal(migrateWalletEvidence(restored, fixtures.map(item => item.capture))[0].sourceCandidates[0].sourceFacts.evidence.length, restored[0].sourceCandidates[0].sourceFacts.evidence.length);
});

test("search and filters change rows but never the source-derived period total", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "exact-cross-source-email");
  state = add(state, "credit-income-email-usd");
  state = add(state, "missing-merchant");
  const rows = visibleActivity(state.records), total = calculateReportingMetrics(rows, "EUR").netFlowMinor;
  assert.equal(filterActivityRecords(rows, "", "income", "all").length, 1);
  assert.equal(filterActivityRecords(rows, "", "expense", "all").length, 1);
  assert.equal(filterActivityRecords(rows, "", "other", "all").length, 1);
  assert.equal(filterActivityRecords(rows, "Exact", "all", "all").length, 1);
  const wallet = walletForRecord(rows.find(record => record.interpretation.merchantText === "Exact Corner"));
  assert.equal(filterActivityRecords(rows, "", "all", wallet.key).length, 1);
  assert.equal(filterActivityRecords(rows, "", "all", "unassigned").length, 1);
  assert.equal(calculateReportingMetrics(rows, "EUR").netFlowMinor, total);
});

test("bank and account choices scope the figures, queue, and activity together", () => {
  let state = { ...EMPTY_SCENARIO, defaultCurrency: "EUR" };
  for (const id of ["exact-cross-source-email", "refund-eur", "transfer-eur", "missing-merchant"]) state = add(state, id);
  const options = sourceScopeOptions(visibleActivity(state.records));
  const south = options.find(option => option.key === "bank:south example bank");
  const account7732 = options.find(option => option.key.startsWith("account:") && option.label.includes("7732"));
  const account1122 = options.find(option => option.key.startsWith("account:") && option.label.includes("1122"));
  assert.ok(south && account7732 && account1122);
  assert.equal(sourceScopedRecords(state.records, south.key).length, 2);
  assert.equal(sourceScopedRecords(state.records, account7732.key).length, 1);
  assert.equal(sourceScopedRecords(state.records, account1122.key).length, 1);
  assert.equal(sourceScopedRecords(state.records, "unassigned").length, 1);
  const scoped = sourceScopedRecords(state.records, account7732.key);
  const ids = new Set(scoped.map(record => record.id));
  const queue = reviewQueue(state, "EUR", "2026-09-28", ids);
  assert.equal(queue.total.count, 1);
  assert.equal(queue.all.netFlowMinor, calculateReportingMetrics(scoped, "EUR").netFlowMinor);
  assert.equal(queue.weekly.netFlowMinor, calculateReportingMetrics(scoped, "EUR", "2026-09-28").netFlowMinor);
  assert.equal(visibleActivity(scoped).length, 1);
  const filtered = filterActivityRecords(visibleActivity(scoped), "no matching merchant", "expense", "all");
  assert.equal(filtered.length, 0);
  assert.equal(reviewQueue(state, "EUR", "2026-09-28", ids).all.netFlowMinor, queue.all.netFlowMinor);
});

test("bulk confirmation affects only ready records in the selected source", () => {
  let state = { ...EMPTY_SCENARIO, defaultCurrency: "EUR" };
  for (const id of ["exact-cross-source-email", "refund-eur", "transfer-eur"]) state = add(state, id);
  const north = sourceScopedRecords(state.records, "bank:north example bank");
  const northQueue = reviewQueue(state, "EUR", "2026-09-28", new Set(north.map(record => record.id)));
  assert.equal(northQueue.ready.length, 1);
  state = confirmReady(state, "EUR", "2026-09-28", northQueue.ready.map(record => record.id));
  assert.equal(state.records.find(record => record.id === north[0].id).confirmationState, "confirmed");
  assert.equal(reviewQueue(state, "EUR", "2026-09-28").total.count, 2);
});

test("a wallet assignment changes viewing scope and undo restores observed source", () => {
  let state = add({ ...EMPTY_SCENARIO, defaultCurrency: "EUR" }, "refund-eur");
  const record = state.records[0], observed = walletForRecord(record);
  state = changeRecord(state, record.id, "edited", "Wallet reassigned", item => ({ ...item, userOverrides: { ...item.userOverrides, walletId: "manual:daily", walletLabel: "Daily wallet" } }));
  assert.equal(sourceScopedRecords(state.records, observed.key).length, 0);
  assert.equal(sourceScopedRecords(state.records, "manual:daily").length, 1);
  assert.ok(sourceScopeOptions(state.records).some(option => option.key === "manual:daily" && option.group === "assigned"));
  state = changeRecord(state, record.id, "edited", "Undo wallet", item => clearUserOverrides(item, ["walletId", "walletLabel"]));
  assert.equal(sourceScopedRecords(state.records, observed.key).length, 1);
  assert.equal(walletForRecord(state.records[0]).detail, observed.detail);
});

test("new fixture identities migrate without replaying confirmations, exclusions, or duplicate choices", () => {
  let state = { ...EMPTY_SCENARIO, defaultCurrency: "EUR" };
  for (const id of ["refund-eur", "transfer-eur", "sparse-cross-source-email", "sparse-cross-source-push"]) state = add(state, id);
  const refund = state.records.find(record => record.sourceCandidates.some(item => item.captureId === fixture("refund-eur").captureId));
  const transfer = state.records.find(record => record.sourceCandidates.some(item => item.captureId === fixture("transfer-eur").captureId));
  const duplicate = state.records.find(record => record.relationships.some(rel => rel.kind === "possible_duplicate_of"));
  state = confirmRecord(state, refund.id);
  state = changeRecord(state, transfer.id, "excluded", "Excluded", record => ({ ...record, disposition: "excluded" }));
  state = duplicateDecision(state, duplicate.id, "separate");
  const before = calculateReportingMetrics(state.records, "EUR").netFlowMinor;
  const old = state.records.map(record => ({ ...record,
    sourceCandidates: record.sourceCandidates.map(candidate => ({ ...candidate, sourceFacts: { ...candidate.sourceFacts, fundingSource: undefined, evidence: candidate.sourceFacts.evidence.filter(item => !["institution", "account", "card"].includes(item.field)) } })),
    sourceProvenance: record.sourceProvenance.map(source => ({ ...source, institutionName: undefined, accountReference: undefined, paymentInstrumentReference: undefined })),
  }));
  const migrated = migrateWalletEvidence(old, fixtures.map(item => item.capture));
  assert.equal(calculateReportingMetrics(migrated, "EUR").netFlowMinor, before);
  assert.equal(migrated.find(record => record.id === refund.id).confirmationState, "confirmed");
  assert.equal(migrated.find(record => record.id === transfer.id).disposition, "excluded");
  assert.ok(migrated.find(record => record.id === duplicate.id).relationships.some(rel => rel.kind === "separate_from"));
  assert.match(walletForRecord(migrated.find(record => record.id === refund.id)).label, /7732/);
  assert.match(walletForRecord(migrated.find(record => record.id === transfer.id)).label, /1122/);
});
