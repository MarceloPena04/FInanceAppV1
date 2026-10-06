# Fictional demo behavior

## Workspace pages

- `/` — Overview: headline detected-flow metrics and the selected week's chart.
- `/transactions` — Transactions: activity for the selected week, an optional start/end date calendar, search and type filters, and detailed record editing.
- `/review` — Review & approvals: the complete ready/attention queues, review coverage, and bulk confirmation.
- `/reports` — Flow details: all-time and weekly totals, daily amounts, and each record's contribution or reason for zero effect.
- `/demo` — Workspace guide: navigation guidance, reprocess/reset tools, and processing history.

The shared workspace retains decisions, source scope, week, and reporting currency while navigating between pages. The notification bell provides a compact pending-work preview and quick confirmation of ready records, with a link to the full review page. Detailed review work and demo tools stay off Overview. Items marked Soon remain unavailable.

## What the dashboard measures

Every figure uses records from fictional notices. All-time detected net flow is detected inflow minus detected outflow for the selected source. The weekly view uses a UTC calendar week. This week is part of all-time history; the two periods must never be added together. Source selection scopes totals, review, and activity together. Search and type filters only narrow activity rows.

Transactions shows only its selected week by default. Choose dates opens a compact calendar for an inclusive start/end range of UTC calendar days. Its list, period count, and net flow follow that range; search and type filters further narrow the shown rows without changing the period's net flow. The count compares shown rows with all visible activity in the selected source across all weeks. Custom dates apply only on Transactions; choosing a week restores the shared weekly view.

Amounts are stored in integer minor units. EUR, USD, and MXN have 100 minor units per major unit; JPY has one. Reporting conversion uses the fixed table `fictional-demo-2026-09-30`, not market exchange rates. Changing the display currency converts eligible values without rewriting source currency or a previously locked default assumption.

Purchase and Expense are outflow. Income, refund, and reversal are inflow. Transfer and withdrawal have zero effect on combined detected flow. Unknown type remains unsigned and unclassified until the person chooses a type. Confirming an already included movement does not add its money again. Excluded, deleted, and duplicate-suppressed records have no effect.

## Records and decisions

Original source facts, current system interpretation, and user corrections stay separate. Corrections can change Amount, Currency, Type, Description, Date, and Wallet. Undo removes only the chosen override; wallet Undo clears its ID and label. Exclude is reversible and retains the record for inspection.

Exact source replay is idempotent. Full matching cross-source evidence merges one event automatically. Sparse evidence stays as two counted records with a possible-duplicate flag. Same transaction suppresses one record's effect while keeping both notices inspectable. Keep as separate retains both effects. Undo restores the undecided pair and preserves a later independent confirmation.

The review queue distinguishes ready records from records needing individual attention. Bulk confirmation acts only on ready records in the chosen source, across all-time history. Unknown type, currency assumptions, possible duplicates, conflicts, missing amounts, and neutral movements need individual review. Saving edits alone leaves a pending record pending. Individual confirmation requires a complete eligible record; a neutral movement can be explicitly confirmed with zero flow impact.

Dates group by user correction, then source event date, source message date, or first processing date. Only actual source event timestamps supply a shown hour. Invalid or unavailable dates remain out of weekly totals and can still appear in all-time review.

## Fictional fixture checkpoints

The focused seed processes 16 notices: 14 candidates, one incomplete trace without an amount, and one rejected notice. These produce 11 unique events. The full set has 40 captures: 34 candidates, one incomplete trace, and five rejections.

For a clean focused seed displayed in EUR:

| Checkpoint | Expected value |
| --- | --- |
| All-time inflow | €18.40 |
| All-time outflow | €83.15 |
| All-time net flow | −€64.75 |
| Unsigned unclassified amount | €7.82 |
| Week beginning 2026-09-28 net flow | −€58.45 |

These values change when corrections, exclusions, duplicate choices, or source scope change. The Example Cafe purchase has no source currency: it locks the first chosen demo default, contributes €17.50 outflow under the EUR seed, and requires individual review. The USD 8.50 unknown notice has zero net effect until a person chooses Expense, Income, or Transfer.

## Presentation walkthrough

1. Reset from Demo guide, then return to Overview and inspect the initial source and currency choices. Explain that the numbers cover fictional detected activity.
2. Open the notification bell for a quick preview, then follow its link to Reviews & warnings. Confirm all ready and show that attention records remain pending while detected money is unchanged.
3. On Transactions, choose the week of Sep 21, open the unclassified notice, choose Expense, and save. Show that its flow changes while its original evidence remains inspectable. Confirm it, then undo confirmation.
4. Choose the week of Aug 31 to inspect Example Cafe's currency assumption. Change the reporting currency and show that the original locked assumption remains intact.
5. Open a possible duplicate. Choose Same transaction, inspect the retained notices, then undo or keep the pair separate.
6. Correct a transaction date to a different week and show the weekly figure move. Open Flow details to inspect daily amounts and contributions. Undo the field correction. Exclude and restore a record.
7. Change source scope, then search and type filters. Source changes all figures; activity filters leave figures and review intact.
8. Refresh to show local decisions survive. On Demo guide, replay focused fixtures to show no second money impact. Reset when ready to return to the clean scenario.

Check both desktop and narrow layouts, keyboard access and focus restoration, Escape and dirty-edit prompts, result/error feedback, the sticky activity controls, and horizontal overflow before presenting. Domain tests alone do not verify these browser behaviors. No participant study has established improved understanding or time saved.

## Browser-local storage and unsupported features

The storage key is `finance-fictional-scenario-v3`. Clearing browser storage, changing profile/device, or resetting discards local decisions. If storage is unavailable, the session can continue but refresh cannot retain those decisions.

The domain includes source-profile currency rules, bulk-preview helpers, and permanent removal with replay markers; these are not promised screen features. There is no live capture/import/sync service, account authentication, production security, verified bank balance, budget, prediction, or category reporting.
