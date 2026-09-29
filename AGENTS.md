<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Personal Finance App — Working Agreement

This project needs an engineer and a mentor. Build carefully, but also explain
what the work means for the product, the user, and the business.

## Start every task here

1. Read this file.
2. Read `docs/product-contract.md` and the current Sprint plan before changing
   code. They define the current boundary; they are not permission to add new
   features.
3. Read the current Sprint 1 record in Notion:
   <https://app.notion.com/p/3e9533a0ad5e81d392f8e6b2041fc78d>.
   Start from its **Business state and done tasks**, **Next action**, and
   **Open decisions and evidence** sections.

## Keep the Notion record current

The Sprint 1 Notion page is the project's simple shared memory. Update it
after every meaningful completed task, important finding, blocker, or business
decision. Do this before finishing the task.

Use plain beginner language. Each update must say:

- what changed;
- why it was built or decided this way;
- what it changes for the business or user;
- what it does not prove yet;
- the next small action or the decision needed; and
- where the evidence lives, using a repository path, test name, command, or
  other check that someone can inspect.

If Notion cannot be reached, say that clearly in the final handoff and do not
claim that the record was updated.

## Explain as a mentor

Assume the reader is new to software. Use short, everyday words. Define a
technical word the first time it matters. Explain the "why" before or alongside
the "how". Do not just list files changed: explain what each file does and how
it fits into the product.

Every meaningful claim needs evidence. For example: "The fixture data is in
`src/fixtures/data/capture-fixtures.json`; the check is in
`tests/fixtures/fixture-loader.test.mjs`; run `npm test`."

## Think beyond code

Before making a meaningful product decision, consider these questions and
record material answers in Notion:

- **User value:** Does this reduce the effort of understanding spending or
  correcting mistakes?
- **Trust and ethics:** Could it invent money facts, hide uncertainty, overstate
  coverage, collect private data without a clear reason, or make a user think a
  detected total is a real bank balance?
- **Business:** What assumption does this test? Does it improve usefulness,
  accuracy, trust, willingness to connect a source, or reduce correction work?
- **Scope:** Is this needed for the current Sprint goal, or is it a later idea?

Keep raw source facts separate from system guesses and user corrections. Use
fictional fixtures unless a separate private-data decision explicitly approves
real data. Never describe detected activity as complete finances or a verified
balance without evidence.

## Finish responsibly

Run the relevant checks. Report what passed, what did not run, and why. Update
Notion with the result and the next smallest useful step. Do not start Gmail,
production integrations, dashboards, or other later work unless the current
task explicitly asks for it.
