# Detected metrics decision table (Sprint 1)

These calculations describe detected activity from the fictional sources that
were processed. They are not a bank balance, total finances, net worth, or a
claim that every account or transaction was found.

| Active event type with amount and currency | Detected inflow | Detected outflow | Detected net flow |
| --- | ---: | ---: | ---: |
| purchase | 0 | amount | negative amount |
| income | amount | 0 | positive amount |
| refund | amount | 0 | positive amount; kept as a refund |
| reversal | amount when the source says money returned | 0 | positive amount |
| withdrawal | 0 | 0 | 0; movement to cash is not global spending |
| transfer | 0 | 0 | 0; do not invent an account ledger |
| unknown, with amount and currency | 0 | 0 | 0; amount displayed separately as unclassified, without a sign |
| excluded or soft-deleted | 0 | 0 | 0 |

Candidates needing confirmation still contribute when their amount, currency,
and event impact are known. Metrics expose that pending review separately.
An unknown-type amount-and-currency candidate contributes zero to signed flow until a person explicitly chooses Expense, Income, or Transfer between accounts. Confirmation alone never supplies the type.
A source-missing-currency candidate with known money direction can use one locked, labelled app-default currency assumption; it remains individually reviewable. Without an assumption or explicit user currency, it remains outside currency totals. Exact source duplicates and explicitly marked duplicates
have one impact; a `possible_duplicate_of` relationship remains counted until a
future, evidence-backed review decision resolves it.

For Sprint 1, an exact cross-source merge has one impact only when both sources
provide the full exact fingerprint: timestamp with time-of-day precision,
amount, currency, event type, and normalized merchant, plus matching
account/payment-instrument identity when both provide one. A pending and a
finalized observation have one impact only when they share an explicit
transaction/reference identity. An unmatched pending observation stays active,
reviewable, and counted. No learned matching window, fuzzy score, or real-source
behavior is part of these calculations.

Open decisions: whether future real source formats can safely supply the exact
fingerprint/reference fields, retention for soft-deleted data, recurring-event
UX, real-data privacy, and any future account/balance model.

An explicit Expense choice creates ordinary detected outflow; Income creates inflow; Transfer between accounts remains neutral in combined detected flow. A missing source currency can use a locked, labelled app-default assumption when selected at first processing; the person must review that assumption individually. Missing amount remains outside totals.

## Reporting currency

The Sprint 1 demo presents one selected reporting currency for all-time and weekly views. Each eligible event is classified first, suppressed if excluded or resolved as a duplicate, and then converted once with the versioned fictional table in `src/domain/reporting-currency.ts`. Totals sum converted integer minor units. The interface exposes the source amount, converted amount, rate formula, rate version, and whether currency came from source, user correction, or a locked assumption. Conversion does not alter source facts and the table is test data, not a live exchange rate.

Pending review shows separate signed inflow, signed outflow, unsigned unclassified amount, and zero or unavailable effects. It presents This week alongside All-time history; This week is already included in All-time history, so the figures are not additive. All-time history includes earlier pending records and any record with no usable date. Calendar grouping continues to use transaction date, then source notification date, then first processed date; the demo does not invent a date if none is usable. Neutral movements and duplicate-suppressed records may still appear for individual decisions, but add zero to these amounts. Bulk confirmation of ready records may leave detected net flow unchanged because pending known activity was already included.

## 2026-10-01 bounded purchase and date correction

The explicit `Payment completed: [amount] at [merchant]` pattern is treated as a purchase. Example Cafe therefore contributes EUR 17.50 detected outflow before confirmation using a locked, labelled EUR assumption in the clean fictional seed. The source still supplies no currency. Changing reporting currency converts EUR 17.50 once; it does not turn the original amount into 17.50 of the new currency. Other unknown types stay unsigned. A user-corrected calendar date changes the weekly period but preserves the source date and any original source hour in evidence.
