import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  fixtureCaptures,
  loadDefaultFixtureDocument,
  loadFixtureDocument,
} from "../../src/fixtures/loader.ts";

test("the committed capture fixture document validates", () => {
  const document = loadDefaultFixtureDocument();
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.records.length, 40);
});

test("fixture identities are unique while exact duplicates preserve a shared source external ID", () => {
  const document = loadDefaultFixtureDocument();
  const captureIds = document.records.map(({ capture }) => capture.captureId);
  assert.equal(new Set(captureIds).size, captureIds.length);

  const duplicates = document.records.filter(({ relationship }) => relationship?.kind === "exact_duplicate_of");
  assert.equal(duplicates.length, 2);
  assert.equal(duplicates[0].capture.metadata.externalId, duplicates[1].capture.metadata.externalId);
  assert.notEqual(duplicates[0].capture.captureId, duplicates[1].capture.captureId);
});

test("fixtures cover the capture formats and expected non-candidate outcomes", () => {
  const document = loadDefaultFixtureDocument();
  const sourceTypes = new Set(fixtureCaptures(document).map(({ sourceType }) => sourceType));
  assert.ok(sourceTypes.has("email"));
  assert.ok(sourceTypes.has("push_notification"));
  assert.ok(document.records.some(({ expected }) => expected.outcome === "no_candidate"));
  assert.ok(document.records.some(({ expected }) => expected.outcome === "candidate" && expected.candidate.status === "incomplete"));
  assert.ok(document.records.some(({ id, capture }) => id === "purchase-without-captured-at" && capture.capturedAt === undefined));

  const providers = new Set(document.records.map(({ capture }) => capture.provider));
  assert.ok(providers.has("Apple Pay"));
  assert.ok(providers.has("Google Pay"));
});

test("schema validation rejects parsed transaction fields inside a capture", () => {
  const filename = fileURLToPath(new URL("../../src/fixtures/data/capture-fixtures.json", import.meta.url));
  const invalid = JSON.parse(readFileSync(filename, "utf8"));
  invalid.records[0].capture.amountMinor = 1299;
  assert.throws(() => loadFixtureDocument(JSON.stringify(invalid)), /does not belong in a capture/);
});

test("fixtures reject a full card number", () => {
  const document = loadDefaultFixtureDocument();
  const invalid = structuredClone(document);
  invalid.records[0].capture.metadata.paymentInstrumentReference = "4111111111111111";
  assert.throws(() => loadFixtureDocument(JSON.stringify(invalid)), /full card number/);
});
