# Product contract — personal finance app (Sprint 1 proposal)

Status: prepared for `docs/product-contract.md` in `MarceloPena04/FInanceAppV1`; not merged. 2026-09-28.

## Product promise

Help a person see and review **financial activity detected from supported sources** with less manual reconstruction. A detected amount describes the records the app found in a stated period and source set. It is not an account balance, a complete spending history, or financial advice.

## Sprint 1 boundary

Input: one fictional source artifact passed through a fixture adapter. Output: a reviewable transaction candidate that retains its source and can be corrected or excluded. First supported pattern: a purchase notification resembling an email. The internal capture boundary must also accept a non-email fixture without changing the candidate model.

Gmail OAuth, live inbox access, push notifications, bank and wallet integrations, budgets, and predictions are future decisions. Do not add personal transaction messages to the public repository.

## Source-agnostic capture boundary

Every adapter produces a `SourceArtifact` with:

- `source_kind` (for example `fixture_email` or `fixture_notification`), `source_id`, `source_event_id`, `received_at`, and a content payload or safe reference;
- a stable identity within that source; and
- only metadata actually supplied by the source. Email sender and subject belong in email adapter metadata, not the shared candidate contract.

The pipeline is `source adapter → eligibility check → source-specific extraction → normalized candidate → review → detected summary`. Extraction may be specific to Banamex or another format, while the normalized candidate and downstream review stay source independent. Unsupported artifacts yield a reason, not invented financial facts.

## Candidate record

- **Observed source facts:** amount in integer minor units, currency, event date with timezone or explicit unknown, merchant/source description as written, event kind (`purchase`, `refund`, `income`, `transfer`, or `unknown`), and references to the source artifact and extraction evidence. Unknown facts remain unknown.
- **System interpretation:** suggested display title/category and confidence or review reason. These fields never masquerade as observed facts.
- **User decision:** accepted, corrected, excluded, or pending, with corrected display fields kept separately. Preserve the original observed facts and a minimal history of changes.

No candidate reaches a monetary summary without a valid amount, an effective currency, and an applicable date for weekly grouping. A bounded recognized purchase with missing source currency may use one locked, labelled app-default currency assumption before confirmation; the original source currency remains missing. An amount-and-currency candidate whose event kind remains `unknown` is unclassified and has zero signed money effect until a person explicitly selects Expense, Income, or Transfer between accounts. Confirmation cannot assign a type. Refunds and transfers need explicit treatment; do not silently classify a refund as income or a transfer as spending. A summary must not add different currencies together.

## Invariants

1. Reprocessing the same `(source_id, source_event_id)` is idempotent. Distinct artifacts that may describe one real-world transaction are flagged for review until cross-source matching has evidence.
2. Raw source facts and provenance are never overwritten by suggestions or corrections. Exclusion remains reversible.
3. Parsing failure or missing facts produces an incomplete/unsupported result and no fabricated amount, merchant, date, or balance.
4. User corrections govern display and eligible aggregation; pending and excluded records are visibly distinguishable.
5. Every total states period, currency, source coverage, and whether pending candidates are included. The UI never claims complete finances or verified balances from detected messages.
6. Fictional fixtures may be committed. Real transaction messages require a separate private handling decision before use.

## Duplicate and evolution rules (Sprint 1 implementation)

- **Exact source replay:** the same source identity is one economic event. A replay adds source provenance but does not change an already reviewed interpretation or its money impact.
- **Different event IDs from one source:** these stay separate, even when their observed transaction facts are identical. They may carry a `possible_duplicate_of` relationship with concrete matching facts, but both remain counted until a person resolves it.
- **Exact cross-source duplicate:** records from different sources merge only when each has an observed timestamp with time-of-day precision, amount, currency, kind, and normalized merchant that all exactly agree. If both sources name an account/payment instrument, those identities must also agree. Missing data cannot make a match exact.
- **Possible duplicate:** a sparse or approximate cross-source match stays as two events and is counted twice. The record stores observed matching reasons (for example `same_amount`), not a confidence percentage. An explicit `duplicate_of` resolution suppresses only the resolved duplicate's impact and keeps its source observations.
- **Pending to finalized:** pending and finalized notices are not duplicates. They become one evolving event only when both give the same explicit transaction/reference identity. The finalized reading becomes the system interpretation; a changed amount is visible in provenance and returns a previously confirmed event to review. Without that reference, the system may only mark a possible relationship and keeps both active and counted.
- **User corrections:** source evidence never overwrites a correction. Material source changes (amount, currency, kind, merchant, observed event time, or settlement state) return a confirmed event to `needs_confirmation`; identical replay and provenance-only changes do not.

## First proof of value

With fictional data, a user can identify what the source actually said, correct or exclude an error, and understand what a weekly detected-spending total covers. The same artifact processed twice changes no total. An unsupported artifact contributes no amount. Record what required correction and whether review was easier than reconstructing the same activity manually; do not infer product-market fit from a class demo.

## Current repository truth

As inspected on 2026-09-30, `src/app/page.tsx` runs the committed fictional captures through the shared parser, lifecycle, persistence, review actions, duplicate decisions, and reporting calculation. The screen is a browser-local Sprint 1 demo: its state survives refresh in that browser profile and exact replay does not duplicate events or undo decisions. Clearing browser storage, using another browser/device, or resetting the demo loses that local state. It has no live source connection, account ledger, verified balance, complete-finances coverage, or multi-user durability.

## 2026-09-30 confirmation amendment

Confirm, Save and confirm, and bulk confirmation use one domain rule. Unknown source type requires an explicit person-selected type before confirmation; a missing source currency uses a locked app-default assumption on first processing when the app has a selected currency. A user correction outranks explicit source currency, which outranks that assumption. No rule fills a missing amount or unknown type. Source facts remain unchanged. Conflicting later source evidence returns the event to review and holds the accepted money impact until the person accepts the change. See `docs/fictional-scenario-manifest.md` and `tests/domain/fictional-scenario.test.mjs`.

## 2026-09-30 reporting-currency amendment

The demo has one person-chosen reporting currency. All-time and weekly totals use the same `reporting-currency.ts` calculation after lifecycle decisions; the screen has no parallel arithmetic. Conversion happens once per active event after corrections and duplicate suppression, using the fixed fictional versioned rates listed in `docs/fictional-scenario-manifest.md`. The trace always shows the source amount/currency, converted amount, rate version, and currency basis. Changing the reporting currency changes presentation and totals, never source evidence.

## Final review correction

Only pending flow-impact records with no attention reason enter Ready to confirm. Confirm selected and Confirm all ready act on that group across all history, writing one action per transaction. Possible duplicates, conflicting evidence, unknown type, assumed currency, and neutral movements require individual review. The pending-review surface shows This week and All-time history. This week is included in All-time history and must not be added to it. All-time history includes earlier pending records and a record without a usable date; the date fallback remains transaction date, then source notification date, then first processed date. Neutral and suppressed records carry no pending money value. The yellow Needs review card and its expanded panel appear only while at least one candidate remains pending. An unresolved possible pair has two top-level records. Same transaction suppresses the relationship child in normal activity while preserving both notices under the retained target; it confirms the retained target when amount, currency, and direction are complete; Undo restores the earlier confirmation state. Keep as separate and Undo remain reversible. Activity uses text and color tags to distinguish income, expenses, and neutral movements. See `src/domain/review-queue.ts` and `tests/domain/review-queue.test.mjs`.

## 2026-10-01 review-field and currency correction

The bounded wording `Payment completed: [amount] at [merchant]` is source-backed purchase evidence. Other unsupported movement wording remains unknown and contributes no signed flow until a person chooses a type. When that purchase omits currency, the fictional demo locks its selected default currency at first processing as a labelled assumption, separate from source facts and user edits. A later reporting-currency change converts the locked amount rather than reinterpreting its source amount. An assumed-currency event needs individual review even while its detected outflow is counted. A later explicit conflicting source currency returns a confirmed event to review and holds the accepted effect until resolved. The review editor highlights only unresolved fields, preserves provenance when an unrelated field is edited, and permits a date-only user correction with an explicit basis and Undo. Source timestamps remain inspectable. The human exercise remains the Sprint 1 closure gate.
