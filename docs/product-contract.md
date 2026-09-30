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

No candidate reaches a monetary summary without a valid amount, an effective currency, and an applicable date. A person may choose one fictional-demo default currency for confirmation when source currency is absent. The approved exception is an explicitly labelled provisional outflow for an amount-and-currency candidate whose event kind remains `unknown`; before confirmation it stays separate; confirmation without a type accepts generic expense as a user decision while preserving source unknown. Refunds and transfers need explicit treatment; do not silently classify a refund as income or a transfer as spending. A summary must not add different currencies together.

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

Confirm, Save and confirm, and bulk confirmation use one domain rule. Unknown source type becomes a user-accepted generic expense at confirmation; absent source currency uses the person's chosen app default, unless an opt-in source-profile rule exists. Precedence is user edit > explicit source currency > opt-in source-profile rule > chosen app default. Neither default fills a missing amount. Source facts remain unchanged. Conflicting later source evidence returns the event to review and holds the accepted money impact until the person accepts the change. See `docs/fictional-scenario-manifest.md` and `tests/domain/fictional-scenario.test.mjs`.

## 2026-09-30 reporting-currency amendment

The demo has one person-chosen reporting currency. All-time and weekly totals use the same `reporting-currency.ts` calculation after lifecycle decisions; the screen has no parallel arithmetic. Conversion happens once per active event after corrections/defaults and duplicate suppression, using the fixed fictional versioned rates listed in `docs/fictional-scenario-manifest.md`. The trace always shows the source amount/currency, converted amount, rate version, and currency basis. Changing the reporting currency changes presentation and totals, never source evidence.

## Final review correction

Only pending flow-impact records with no attention reason enter Ready to confirm. Confirm selected and Confirm all ready act on that group across all history, writing one action per transaction. Possible duplicates, conflicting evidence, unknown type, missing source currency, and neutral movements require individual review. The selected-week and elsewhere amounts partition the same shared reporting calculation; neutral and suppressed records carry no pending money value. An unresolved possible pair has two top-level records. Same transaction suppresses the relationship child in normal activity while preserving both notices under the retained target; it does not confirm that target. Keep as separate and Undo remain reversible. Activity uses text and color tags to distinguish income, expenses, and neutral movements. See `src/domain/review-queue.ts` and `tests/domain/review-queue.test.mjs`.
