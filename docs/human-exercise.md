# Same-artifact human exercise (prepared, participant untested)

Use the focused 16 fictional capture texts in `docs/fictional-scenario-manifest.md` twice. Do not tell the person the expected totals first. Randomize which method comes first across participants, or use two people with opposite order, to reduce practice effects.

1. **Manual reconstruction:** Give the person the 16 raw texts and source IDs/times in their processing order, without parser or expected outcomes. Give them the fixed fictional conversion table and ask for all-time and 2026-09-28 detected net flow in EUR, plus a note of ambiguous or repeated notices. Record start/end time, each search/lookup/calculation, missed or double-counted events, corrections, and their explanation of what the totals cover.
2. **App review:** Reset the fictional demo, process the same focused sequence, choose EUR as the reporting currency, inspect all-time and weekly summaries, open the review queue, resolve the sparse pair as Same transaction then undo it, explicitly classify `missing-merchant` and review the assumed EUR on `payment-without-currency`, correct and undo a transaction date and a foreign-currency value, exclude and restore an event, and inspect source excerpts and the incomplete trace. Ask for the same totals, how each was built, and what is missing from coverage. Record the same measures.
3. **Compare:** Time spent, number of actions, errors, corrections, duplicate decisions, and whether the person can explain the final number without calling it a balance or complete finances. Ask whether the person noticed that Example Cafe uses an assumed EUR currency, not a source-supplied EUR, and which source evidence or default was hard to understand. A preference statement alone is not time-savings evidence.

Record observations in a copy of this template:

| Measure | Manual | App |
| --- | --- | --- |
| Participant/date/order | untested | untested |
| Elapsed time | untested | untested |
| Actions/lookups | untested | untested |
| Missed or double-counted events | untested | untested |
| Corrections | untested | untested |
| Final numbers and explanation | untested | untested |
| Coverage/default understanding | untested | untested |

No participant was available during this build. The human-value question remains open.

## Final acceptance gate after second qualitative pass

The participant said the revised feed was substantially more usable, but the final correction still needs their observed answer. Ask them to find and use Confirm all ready; verify Needs attention stayed pending; explain that This week is included in All-time history; choose Same transaction and inspect both linked notices under one card; undo and explain all-time versus weekly detected totals. Verify that completing the final pending candidate removes the yellow Needs review card and that undoing a confirmation restores it. Record whether this was easier or faster than reconstructing the same fictional notices manually, including approximate time, actions, or errors when available. Do not mark Sprint 1 complete from machine checks alone.

## Owner-reported qualitative feedback — 2026-10-01

The owner reported feedback from one person: the current screen felt aggressive and overwhelming, and did not feel designed for mobile use. The requested direction is a compact summary that foregrounds detected activity, keeps Needs review closed until opened, and opens transaction details on demand in a mobile sheet. Treat this as a qualitative report from the owner; it is not an observed timed/manual comparison, and it does not establish that the changes improve review time or outcomes.

The exercise still needs an observed participant using the changed UI. Compare app review with manual reconstruction using the same fictional notices, and record the participant's explanation of the totals, actions, errors, and coverage understanding. Sprint 1 remains open until that exercise and the existing final acceptance checks are completed.

## Source and filter follow-up — 2026-10-01

The owner also reported that the participant wanted a friendlier distinction between income and expense, a quick way to show just one type, and the bank, account, or card behind each activity. The same person saw multi-bank and multi-account activity as the potential value beyond one bank's app. This is qualitative feedback reported by the owner, not a measured usability result.

During the still-open human exercise, ask the participant to:

1. Find an income, an expense, and an unclassified item. Explain the different money effects.
2. Find which bank, account, and card the fictional Exact Corner purchase names. Open its details and point to the original notice evidence. Find one activity with no identified source and say what remains unknown.
3. Filter to Income, then search for a merchant and choose a wallet. Explain why the list changes while the selected week's detected net flow stays the same. Ask whether the wording makes clear that the amount is detected flow, not money remaining.
4. Correct a wallet in the detail sheet and undo it. Check whether the participant can still distinguish the notice's source facts from their own assignment.

Record task completion, time or actions when possible, wrong interpretations, corrections, and the participant's own explanation. The added fixtures and automated checks do not close this human exercise.
