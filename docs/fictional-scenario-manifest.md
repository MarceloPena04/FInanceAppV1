# Fictional source-to-total acceptance ledger

Written from the committed source texts and product rules before using the app's calculated output as the answer. UTC calendar weeks; the review uses one chosen reporting currency. Order is the focused button order in `src/app/page.tsx`.

| Order | Capture | Expected handling |
|---:|---|---|
| 1 | missing-merchant | USD 8.50, unknown source kind. Unclassified USD 8.50 with zero signed effect until the person explicitly chooses a type. Source kind stays unknown. |
| 2 | payment-without-currency | “Payment completed: 17.50 at Example Cafe” supplies bounded purchase evidence but no currency. The clean seed locks EUR as an app-default assumption, so EUR 17.50 detected outflow enters week 2026-08-31 before review; source currency remains missing and the event needs individual review. |
| 3–4 | exact-cross-source-email/push | Strict timestamp, EUR 8.50, purchase, merchant match; one event, EUR 8.50 outflow. |
| 5–6 | sparse-cross-source-email/push | Date only: possible pair, two EUR 6.00 outflows until Same event suppresses one. |
| 7–8 | duplicate-source-original/replay | One source identity, EUR 7.20 outflow once in week 2026-09-14. |
| 9–10 | referenced-pending/finalized-usd | One referenced event; USD 20.00 before finalized, USD 21.25 after finalized in week 2026-09-28. If confirmed before finalization, it must return to review and show the change. |
| 11–12 | unlinked-pending/finalized-usd | Two events, each USD 10.00; unresolved relationship stays visible. |
| 13 | refund-eur | EUR 18.40 inflow in week 2026-09-21. |
| 14 | transfer-eur | Neutral EUR movement in week 2026-09-14. |
| 15 | missing-amount | Incomplete trace only, no activity record or money impact; defaults cannot supply amount. |
| 16 | unsupported-bank-service-notice | Rejected, no event. |

Expected parser outcomes for the focused sequence: 14 detected, 1 incomplete, 1 rejected. Expected unique lifecycle events: 11. The incomplete item stays only in the processing trace. Exact cross-source, exact source replay, and referenced finalization each reduce the 14 detected candidates by one.

## Fixed fictional reporting rates

Version `fictional-demo-2026-09-30` stores each currency's exact value in EUR: EUR = 1/1, USD = 23/25, MXN = 1/20, JPY = 3/500. Every pair uses `source EUR value ÷ target EUR value`, then rounds once to the target currency's minor unit: EUR→USD 25/23, EUR→MXN 20/1, EUR→JPY 500/3; USD→EUR 23/25, USD→MXN 92/5, USD→JPY 460/3; MXN→EUR 1/20, MXN→USD 5/92, MXN→JPY 25/3; JPY→EUR 3/500, JPY→USD 3/460, JPY→MXN 3/25. Same-currency conversion is 1/1. These values are fictional and deterministic; they are not current market rates.

Clean focused-sequence checkpoint in reporting EUR: all-time detected inflow **€18.40**, detected outflow **€83.15**, detected net flow **−€64.75**, with **€7.82** unclassified and excluded from that net; week 2026-09-28 net **−€58.45**. All records needing review are counted separately from money effect. Pending inflow, outflow, unclassified amount, and zero-effect records are never added into one value. Source amounts and currencies remain unchanged by conversion.

## Expected checkpoints

- Week 2026-09-28 EUR: before duplicate choice, 0 inflow − (8.50 + 6.00 + 6.00) = **−20.50**. After Same event on sparse pair: **−14.50**. Undo restores **−20.50**. Separate events keeps **−20.50**.
- Week 2026-09-28 USD: referenced pending alone **−20.00**, after finalized **−21.25**; with both unlinked USD 10.00 events, final **−41.25**. Confirmation does not add a second impact.
- Week 2026-09-21 USD: missing-merchant before confirmation ordinary net **0**, unclassified **8.50**; confirmation alone leaves net **0**. After an explicit Expense choice, net **−8.50**; an Income choice makes **+8.50**, and Transfer between accounts keeps net **0**. EUR refund **+18.40**; missing amount stays zero.
- Week 2026-08-31 EUR: payment-without-currency has detected outflow **−17.50** before review from the bounded purchase wording plus locked, labelled EUR assumption. Confirmation of that displayed purchase does not change its effect. A later conflicting explicit source currency returns a confirmed record to review and holds the accepted EUR impact until resolved.
- Correction: changing exact-cross-source event from EUR 8.50 to EUR 9.00 changes Sep 28 EUR from −20.50 to **−21.00**. Undo restores **−20.50**. Excluding it changes −20.50 to **−12.00**; restore returns **−20.50**.
- Deleting that exact event removes both source identities from visible content. Replaying the same two captures leaves the event absent and the week at **−12.00**. A refresh followed by replay leaves the same decisions and totals. Reset deliberately clears deletion markers.
- Confirming a known movement has zero net change. Bulk preview must show exact count and money difference. Missing-amount is ineligible; unresolved possible duplicates remain separate.

The full fixture set is a parser coverage run, not one financial total. It spans weeks and currencies. Human review must use the same source texts twice, once manually and once in the app; no time-saving claim follows from machine checks alone.

## Final review behavior checkpoint

Ready to confirm excludes any attention reason, regardless of selected week. Confirm all ready records an action for each ready event. The review summary uses the shared reporting conversion to show pending money for This week and All-time history. This week is included in All-time history, which also holds earlier records and any pending record with no usable date. A resolved sparse duplicate leaves one top-level transaction, both original notices in linked evidence, and the retained event still pending until confirmed. Income, expense, and neutral tags make direction visible without changing the underlying event kind. See `tests/domain/review-queue.test.mjs`.
