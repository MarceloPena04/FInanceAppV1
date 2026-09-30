# Human review and correction — Sprint 1 decision record

Status: product direction agreed in conversation on 2026-09-29; implementation remains unbuilt. This record narrows the fictional-data review path. It does not authorize a real source, a verified balance, or a complete-finances claim.

This decision record supersedes the older `unknown`-is-neutral metric row in `docs/detected-metrics.md` and the event-kind prerequisite for every monetary summary in `docs/product-contract.md`. The new exception is an explicitly labelled **provisional outflow** for an amount-and-currency candidate whose event type is still unknown. The older documents should be reconciled during implementation; other invariants remain in force.

## Purpose and language

The first product test is whether automatically detected activity plus a quick review saves work compared with reconstructing expenses manually. A detected item is a candidate, not a verified bank transaction. An unapproved candidate may affect **detected** inflow, outflow, and net flow. Confirmation acknowledges the displayed movement; it is not bank verification. Never call detected net flow a wallet or account balance.

The first functional view uses calendar weeks and one currency at a time. It states the period, currency, fictional source coverage, pending count and pending impact, and provisional impact. Negative detected net flow is valid. Starting money, manual entries, and estimated remaining money are a later slice.

## Separate evidence, interpretation, and decisions

1. Keep the original source observation, source identity, evidence excerpts, and any later finalized observation separate from app interpretations.
2. Keep user corrections and source-specific rules separate from both. Show when a currency came from a user rule or when an outflow is an assumption.
3. Do not turn a parser's processing timestamp into a claimed transaction timestamp. For calendar grouping, prefer the explicit source transaction date, then a source-provided message/notification date, then the app's first-seen time. Store and display which date basis was used. A date-only source value must remain date-only. For the fictional demo, use a stated UTC convention for timestamp-based week grouping; the future user's local-timezone rule remains undecided.

## Immediate impact and attention

- A detected active purchase, income, refund, reversal, or other supported movement may affect detected metrics before confirmation, using the existing event-impact rules. Confirmation does not add a second impact.
- A detected event with an amount and currency but unknown event type contributes a **provisional outflow** before confirmation, even if its wording does not establish spending. Keep its type `unknown`, expose the assumption and its amount separately, and require a person to classify it before it can be confirmed. Do not display the assumption as a source fact or ordinary confirmed spending.
- A candidate without currency remains visible but cannot enter any currency-denominated money total until the person assigns currency or an applicable opt-in source rule supplies it. Show its count separately. Do not silently apply a global currency default.
- A user may opt into a currency fallback for a specific fictional source profile (provider/channel plus payment instrument where available), not for one event ID. The rule supplies an assumed currency only when the source omits one; explicit source currency wins. Label the currency as assigned by the user's rule. The later real-source version needs trustworthy source identity and multi-currency safeguards.
- Excluded candidates remain visible, marked as excluded, with zero metric impact. Exclusion can be reversed.

## Review actions

- Every detected event is offered for human confirmation. A concise card shows amount, currency and its basis, merchant/description, date and its basis, event type or assumption, source, current metric impact, and attention reason. Source detail is available without manual reconstruction.
- `Confirm` means the person accepts the presented movement. `Save and confirm` applies an edit or comment and confirms on save. A user-facing `corrected` state is unnecessary; show `Edited by you` for changed fields. Changes to amount, currency, date, event type, or display text remain user-owned and do not overwrite source evidence. Comments and categorization may be added without claiming they came from the source.
- Undoing an edit restores the current app interpretation for selected fields and leaves source evidence and minimal action history. Removing an exclusion is a separate action.
- Prominent bulk action: confirm ordinary eligible candidates after showing count and total impact. Secondary bulk action: confirm all **eligible** candidates after previewing exceptions, possible double counting, and material changes. Candidates without currency or with unknown event type are ineligible until resolved. An unresolved possible duplicate may remain two counted events even if both are confirmed; the warning must say so. Bulk confirmation never decides a duplicate relationship or fills missing facts.
- A later finalized observation with the same explicit transaction reference becomes the app's source reading, whether its amount rises or falls. A material change returns confirmation to pending, preserves user corrections, and shows old versus new evidence. The effective value follows an existing user override until the person changes or removes it.

## Transaction identity and deletion

- Exact source replay remains one event. Exact cross-source merging uses the existing strict observed fingerprint. A sparse possible match stays as two counted events until explicitly resolved.
- A possible-duplicate review offers `Same event`, `Separate events`, and `Decide later`. `Same event` suppresses one impact while retaining both observations; `Separate events` keeps both impacts and prevents that pair from repeatedly asking for review. A relationship decision must be reversible.
- Permanent deletion removes the event, its captured content, corrections, and history from the app and visible activity. A minimal suppression marker may remain solely to prevent that source event from being imported again. The app must disclose this exception and must not describe it as erasing every trace. The fictional prototype must prove that replay does not resurrect a deleted event. Real-data deletion, backups, retention, and revocation require a separate policy before real-source work.

## Sprint 1 implementation boundary

Implement this contract with fictional fixtures, the existing parser/lifecycle, the smallest durable local/test storage boundary, a small review surface, and a calendar-week detected summary. Connect the functional path to real state; keep any unrelated class mock visibly marked as a demo. Test source replay, refresh, edits, exclusion, deletion suppression, duplicate choices, source currency rules, unknown provisional outflow, bulk actions, and latest-finalized changes. Observe whether a person can understand and correct candidates faster than manual reconstruction.

## Designed now, implemented later

User-entered starting amount, manual transactions, estimated remaining money, accounts, real source connections, source authentication, multi-currency source-rule safeguards, real-data privacy/deletion operations, and balance reconciliation. These must not be simulated as working capabilities in the Sprint 1 functional path.

## Still unresolved; do not guess

- How to define an account-scoped starting amount, its effective date, and reconciliation when the later remaining-money view is built.
- Which authenticated real-source and instrument identifiers make a currency rule safe, including foreign-currency messages.
- Real-data suppression-marker retention, backup erasure, and source revocation policy.
- Whether the first user test demonstrates enough review-time savings or trust to justify a real-source alpha.
- Which user timezone defines weeks and months after the fictional demo.

## Current code gap

`src/domain/transaction-lifecycle.ts` has in-memory replay handling, confirmation, basic overrides, exclusion, and detected metrics; it does not persist after refresh, filter calendar weeks, retain an action history, support all money-affecting corrections, or implement deletion suppression. `src/app/page.tsx` is a hard-coded class mock, not this path. See `docs/product-contract.md`, `docs/detected-metrics.md`, and `tests/domain/transaction-lifecycle.test.mjs` for the prior boundary and tests.

## 2026-09-30 owner amendment (supersedes blockers above)

Confirm, Save and confirm, and eligible bulk confirmation accept unknown source type as generic expense and absent source currency from the person's chosen fictional-demo default without an interruption. Original unknown and missing values remain in source evidence; action history labels the accepted default. The opt-in source-profile rule, when configured, outranks the chosen app default; explicit source currency and user edits outrank both. Missing amount still blocks confirmation. Conflicting later source evidence shows old and new money readings, holds the accepted impact, and requires review. See the focused ledger in `docs/fictional-scenario-manifest.md`.
