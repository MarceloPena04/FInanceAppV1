# Wallet source handoff for Sprint 2 preparation

This is a role-based handoff, not an assignment. Agree named owners and capacity before planning Sprint 2 work.

| Role | This change and next check |
| --- | --- |
| Source-path owner | Maintain fictional bank/account/card examples in `src/fixtures/data/capture-fixtures.json`, validation in `src/fixtures/loader.ts`, and explicit extraction in `src/parser/transaction-parser.ts`. Check that a delivery provider is never presented as a bank and no full card number enters fixtures. |
| Data-path owner | Maintain provenance, source conflict review, reversible wallet assignment, duplicate identity safeguards, and old browser-state migration in `src/domain/transaction-lifecycle.ts` and `src/domain/wallet-source.ts`. Check that source facts remain separate from user edits and totals survive migration. |
| Interface owner | Maintain clear income/expense/other rows, the source detail sheet, search and filters, and the sticky controls in `src/app/page.tsx`, `src/app/activity-controls.tsx`, and `src/app/globals.css`. Check keyboard use and narrow widths. |
| Founder | Approve the short trust wording and observe the human exercise in `docs/human-exercise.md`. Record what the participant can find and explain before deciding whether this improves review effort or willingness to connect several sources. |

The current implementation identifies the source of detected activity in a fictional browser-local demo. It does not establish bank balances, budgets, remaining credit, real-source access, or measured user benefit. Those are separate product and safety decisions.
