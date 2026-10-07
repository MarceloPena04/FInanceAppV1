# Pennywise fictional finance demo

A browser-local demo for reviewing activity detected from fictional financial notices. Pennywise keeps its visual style across a focused Overview dashboard and dedicated Transactions, Review & approvals, Flow details, and Workspace guide pages. The notification bell offers a compact review preview with quick actions.

This project defaults to mock authentication and has no backend, database, live bank connection, or live exchange rates. Detected net flow is inflow minus outflow from the notices in view; it is not an account balance or complete spending history. Demo decisions are saved per account in `localStorage` in the current browser profile.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Node.js 22.18 or newer is recommended so the dependency-free TypeScript domain tests can run.

Signed-out visitors arrive at `/login`. Sign in with the Preview mode credentials, `demo@finance.app` / `Demo1234!`, or open `/signup` to create a local test account. Use test credentials only. Sign-up signs you in; subsequent sign-ins check the registered password. Remember me keeps a mock session across browser restarts; unchecked sign-ins last in the current tab. Sign out from the sidebar.

Each registered account starts with sample transactions and keeps its own review decisions. Demo sign-in preserves the original workspace's saved decisions. Auth pages keep your requested workspace URL so signing in returns you to it.

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

The domain and fixture tests cover parser outcomes, event identity, duplicate decisions, corrections and undo, fictional currency conversion, review readiness, UTC periods, source scope, and the mock auth lifecycle. They do not establish browser accessibility or interaction correctness.

See [docs/auth-workflow.md](docs/auth-workflow.md) for mock behavior, the auth adapter contract, and wiring a cookie-based backend with `NEXT_PUBLIC_AUTH_MODE=api`. The client route guard supports the demo workflow; backend session validation and authorization are required before connecting real financial data.

See [docs/demo-behavior.md](docs/demo-behavior.md) for the behavior contract, fixture checkpoints, and a short presentation walkthrough. The reusable domain, parser, fixtures, and tests originate from source commit `a9f19a5dd74766127e194d639e76bc479b6fb8f2`.
