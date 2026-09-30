# Sprint 1 plan — prove the capture-to-review loop

Status: prepared for `docs/sprint-1-plan.md` in `MarceloPena04/FInanceAppV1`; not merged. 2026-09-28.

## Outcome and decision

Prove that a source artifact can become a trustworthy, reviewable candidate and a clearly scoped weekly detected-spending view. At the end, decide whether to continue with a real source based on extraction usefulness, correction effort, and user understanding. The existing screen is a class demo mock, not evidence that the finance path works.

## Build order

1. **Agree on the contract.** Review `product-contract.md` with the team; confirm purchase/refund/transfer meanings, review states, and who decides changes. Keep unanswered points explicit.
2. **Create safe fixtures.** Add fictional examples for a normal purchase, missing merchant, refund, transfer, duplicate delivery, malformed/unsupported content, and one notification-shaped artifact. Include expected outcomes in a small fixture manifest. Never commit real Banamex messages, identifiers, or tokens.
3. **Implement the capture boundary.** Make fixture adapters emit `SourceArtifact`. Add eligibility and format-specific extraction that returns normalized observed facts or a documented failure. Use integer minor units and preserve evidence references.
4. **Persist and deduplicate.** The fixture-only lifecycle now deterministically keeps exact source replays idempotent, merges only complete exact cross-source fingerprints, leaves sparse matches as counted possible duplicates, and evolves pending to finalized only with a shared explicit reference. The remaining work is the smallest durable storage solution and review surface; reprocessing after refresh is not yet proven.
5. **Connect review and summary to real state.** Replace hard-coded transaction rows for the functional path with candidates. Show observed facts separately from suggestions, let the user correct/exclude, and calculate one weekly detected-spending total for one currency with period/source/coverage labels. Preserve the class mock only if visibly marked as a demo.
6. **Run the end-to-end check.** Feed fixtures through adapter → candidate → review → correction/exclusion → weekly summary. Check repeat processing, unsupported input, refund/transfer handling, and persistence after refresh.
7. **Test the product question.** Ask someone to find and correct an error, explain the total's coverage, and compare the effort with reconstructing the same week manually. Record observations, not just opinions.

## First working session

Create the contract and fictional fixture manifest, then implement the smallest vertical path for one purchase plus one unsupported artifact. Show both outcomes in the app before expanding formats or polishing charts. The next session starts with the first failing acceptance check, not a new feature list.

## Acceptance checks

- A supported fictional purchase retains source identity and observed evidence and appears once after two processing attempts.
- An unsupported or incomplete artifact produces no invented transaction or monetary total.
- A correction changes the displayed interpretation and eligible weekly total while leaving original observed facts intact.
- Excluding a candidate removes its contribution and can be reversed.
- The weekly total states currency, dates, source coverage, and pending treatment; users do not mistake it for a bank balance or all spending.
- The same pipeline accepts email-shaped and notification-shaped fixtures through adapters, with no email field required in the normalized candidate.

## Gates after this sprint

Only after the fixture path works: decide whether an authorized manual Gmail sync is feasible and valuable, check current consent/scope requirements, and test source coverage with permission. Push/watch and other capture sources follow evidence of need. A source integration is not accepted merely because authorization succeeds; candidate usefulness and data handling must also pass.

## Stop-and-resume log (update after each work session)

- **Current state:** The in-memory fictional-data path has parser, lifecycle, detected metrics, exact replay protection, exact cross-source merging, possible-duplicate relationships, and referenced pending-to-finalized evolution. The UI remains a mock and there is no durable persistence.
- **Last completed:** Deterministic duplicate/evolution increment, proven with 38 fictional captures and lifecycle tests.
- **Next action:** Choose and implement the smallest durable local/test storage boundary, then attach the existing review/correction rules to one visibly non-demo path.
- **Blocked/open:** No learned time window, fuzzy matching, source-specific behavior, or real-source data has been tested. Pending/final records without a shared reference remain suggestions only.
- **What this reveals:** The product can protect totals from the known fixture cases without claiming complete finances, but it still needs persistence and a review UI before a person can test the full experience.

## 2026-09-30 connected fictional validation

The source-to-total inspection path, scenario ledger, and domain checks now exist. Machine verification and browser interaction are evidence for the fictional path; the human time/comprehension comparison remains open. Sprint 1 stays open until an observed person completes the bounded exercise in `docs/human-exercise.md` and the result is recorded.

## Final correction status

The review queue now separates ready records from attention decisions, splits pending monetary value by selected week and other history, and shows a resolved duplicate as one normal activity card with linked evidence. The participant's short final acceptance answer and manual-versus-app effort observation are still required before this Sprint can be closed. Code evidence: `src/domain/review-queue.ts`, `src/app/page.tsx`, and `tests/domain/review-queue.test.mjs`.
