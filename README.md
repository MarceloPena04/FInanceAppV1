# Pennywise fictional finance demo

A browser-local demo for reviewing activity detected from fictional financial notices. Pennywise keeps its visual style across a focused Overview dashboard and dedicated Transactions, Review & approvals, Flow details, and Workspace guide pages. The notification bell offers a compact review preview with quick actions.

This project has no backend, database, live bank connection, or live exchange rates. Detected net flow is inflow minus outflow from the notices in view; it is not an account balance or complete spending history. Demo decisions are saved in `localStorage` in the current browser profile.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Node.js 22.18 or newer is recommended so the dependency-free TypeScript domain tests can run.

Use the sidebar to move between `/`, `/transactions`, `/review`, `/reports`, and `/demo`. Source scope, week, reporting currency, and decisions remain shared across the pages. Features marked Soon remain unavailable.

Transactions shows the selected week by default. Use Choose dates to select an inclusive start/end range; its event list and net flow follow that range. Search and type filters narrow the list further. Choosing a week returns to the shared week selection.

## Check the implementation

```bash
npm test
npx next typegen
npx tsc --noEmit
npm run lint
npx next build --webpack
git diff --check
```

The 61 domain and fixture tests cover parser outcomes, event identity, duplicate decisions, corrections and undo, fictional currency conversion, review readiness, UTC periods, and source scope. They do not establish browser accessibility or interaction correctness.

See [docs/demo-behavior.md](docs/demo-behavior.md) for the behavior contract, fixture checkpoints, and a short presentation walkthrough. The reusable domain, parser, fixtures, and tests originate from source commit `a9f19a5dd74766127e194d639e76bc479b6fb8f2`.
