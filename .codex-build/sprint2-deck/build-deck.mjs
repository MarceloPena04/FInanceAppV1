import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/aescobedo/Documents/intercambio/Aalto/WWWSERVICES/FInanceAppV1";
const SKILL_DIR = "/Users/aescobedo/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const TMP_DIR = path.join(workspaceDir, ".codex-build/sprint2-deck");
const FINAL_PPTX = path.join(workspaceDir, "output/financeapp-sprint2-team-brief-2026-10-05.pptx");
const coverPath = path.join(workspaceDir, "assets/presentation/sprint2-cover-illustration.png");
const { resolvePresentationFont, finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);

const font = resolvePresentationFont();
const width = 1280, height = 720;
const navy = "#092639", ink = "#123447", teal = "#1F7A78", mint = "#A8D9CD", amber = "#E8B65A", cream = "#F6F1E8", mist = "#EAF2F0", slate = "#5E7180", white = "#FFFFFF";
const deck = Presentation.create({ slideSize: { width, height } });
const cover = await fs.readFile(coverPath);

function textbox(slide, text, left, top, w, h, style = {}) {
  const s = slide.shapes.add({ geometry: "textbox", position: { left, top, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = text;
  s.text.style = { typeface: font, fontSize: style.fontSize ?? 22, color: style.color ?? ink, bold: style.bold ?? false, autoFit: "shrinkText", breakLine: false, ...style };
  return s;
}
function fill(slide, color) { slide.background.fill = color; }
function footer(slide, n) { textbox(slide, `FINANCEAPP  /  SPRINT 2 TEAM BRIEF  /  ${String(n).padStart(2, "0")}`, 72, 676, 900, 18, { fontSize: 10, color: "#75909A", bold: true }); }
function title(slide, t, sub, n, dark = false) {
  textbox(slide, t, 72, 46, 1080, 58, { fontSize: 36, color: dark ? white : navy, bold: true });
  if (sub) textbox(slide, sub, 74, 108, 1030, 36, { fontSize: 16, color: dark ? "#B8D7D2" : slate });
  footer(slide, n);
}
function note(slide, text) { slide.speakerNotes.textFrame.setText(text); }
function bullet(slide, head, body, x, y, w) {
  textbox(slide, head, x, y, w, 27, { fontSize: 18, bold: true, color: teal });
  textbox(slide, body, x, y + 30, w, 68, { fontSize: 16, color: ink });
}

// 1. Cover
{
  const s = deck.slides.add();
  s.images.add({ blob: cover, contentType: "image/png", alt: "Abstract protected source-to-review journey", fit: "cover", position: { left: 0, top: 0, width, height } });
  textbox(s, "FinanceApp", 72, 80, 510, 52, { fontSize: 28, bold: true, color: mint });
  textbox(s, "Sprint 2\nTeam Brief", 72, 142, 560, 145, { fontSize: 58, bold: true, color: white });
  textbox(s, "Current product state, integration plan, and ownership", 76, 314, 500, 48, { fontSize: 20, color: "#D7E9E5" });
  textbox(s, "Meeting · 5 October 2026", 76, 620, 400, 22, { fontSize: 14, color: "#B8D7D2" });
  note(s, "Purpose: align the team on what exists today, the bounded Sprint 2 goal, and the interfaces between roles. Cover art is an abstract AI-generated visual, not a claim about a live integration.");
}

// 2. Meeting outcome
{
  const s = deck.slides.add(); fill(s, cream); title(s, "Today’s outcome", "Leave with one shared build boundary and clear ownership", 2);
  textbox(s, "Sprint 2 has one goal: an invited person completes one trusted capture journey.", 72, 188, 1040, 46, { fontSize: 28, bold: true, color: navy });
  bullet(s, "Agree the supported source pattern", "One sender or message format, one test-user route, and an explicit fallback import if Gmail is unsuitable.", 74, 292, 315);
  bullet(s, "Agree the integration contract", "Each workstream passes a stable record forward and proves its own failure cases before integration.", 461, 292, 315);
  bullet(s, "Agree the sprint gate", "A non-builder must use the complete path, explain coverage, return to their own record, and disconnect or delete.", 848, 292, 315);
  note(s, "Source: Sprint 2 plan in the Product & App State and Venture & Sprint Hub. This meeting should decide scope and interfaces before OAuth or database implementation.");
}

// 3. Where we are today
{
  const s = deck.slides.add(); fill(s, mist); title(s, "The prototype already proves a fictional review loop", "The current app is useful for testing logic and interaction, not yet for an invited person’s private data", 3);
  textbox(s, "Fictional source artifact", 82, 205, 270, 28, { fontSize: 19, bold: true, color: navy });
  textbox(s, "Parser and source evidence", 82, 275, 270, 28, { fontSize: 19, bold: true, color: navy });
  textbox(s, "Lifecycle and duplicate logic", 82, 345, 270, 28, { fontSize: 19, bold: true, color: navy });
  textbox(s, "Review, corrections, and totals", 82, 415, 320, 28, { fontSize: 19, bold: true, color: navy });
  textbox(s, "What works today", 520, 195, 260, 27, { fontSize: 18, bold: true, color: teal });
  textbox(s, "• Detects supported fictional transactions\n• Preserves source evidence\n• Lets a user confirm, correct, exclude, or resolve duplicates\n• Persists choices after refresh in the same browser\n• Scopes detected flow by source, account, or card", 520, 232, 560, 185, { fontSize: 18, color: ink });
  textbox(s, "What it does not do yet", 520, 464, 320, 27, { fontSize: 18, bold: true, color: "#A65B3C" });
  textbox(s, "No Gmail connection, hosted identity, shared database, secure multi-user storage, verified balance, or complete financial history.", 520, 500, 570, 64, { fontSize: 18, color: ink });
  note(s, "Source: docs/product-contract.md, src/app/page.tsx, and the current Product & App State. Do not call the current detected flow a balance or complete spending history.");
}

// 4. Product logic
{
  const s = deck.slides.add(); fill(s, white); title(s, "The product keeps three kinds of information separate", "This is the core trust rule that every Sprint 2 component must preserve", 4);
  textbox(s, "Observed source facts", 78, 205, 290, 34, { fontSize: 23, bold: true, color: navy });
  textbox(s, "What the source actually supplied: amount, currency, date, merchant wording, event type, source identity, and evidence excerpt.", 78, 253, 295, 145, { fontSize: 18, color: ink });
  textbox(s, "System interpretation", 492, 205, 290, 34, { fontSize: 23, bold: true, color: teal });
  textbox(s, "A suggested label or review reason. It helps the person review the record but must never replace the source facts.", 492, 253, 295, 145, { fontSize: 18, color: ink });
  textbox(s, "User decision", 906, 205, 260, 34, { fontSize: 23, bold: true, color: "#A65B3C" });
  textbox(s, "Accepted, corrected, excluded, or pending. Corrections change the displayed or counted result while keeping original evidence visible.", 906, 253, 270, 145, { fontSize: 18, color: ink });
  textbox(s, "A missing amount, unclear type, or unsupported message stays incomplete or unclassified. The app never invents a money fact.", 92, 508, 1020, 48, { fontSize: 23, bold: true, color: navy });
  note(s, "Source: docs/product-contract.md, Candidate record and invariants. The current contract requires source facts, system interpretation, and user decisions to remain separate.");
}

// 5. Technology
{
  const s = deck.slides.add(); fill(s, navy); title(s, "The current technology base is small and inspectable", "Sprint 2 should extend the existing domain logic rather than rebuild it", 5, true);
  textbox(s, "Web application", 82, 195, 270, 28, { fontSize: 19, bold: true, color: mint });
  textbox(s, "Next.js 16.3.5\nReact 19.2.8\nTypeScript\nTailwind CSS 4", 82, 237, 270, 130, { fontSize: 22, color: white });
  textbox(s, "Domain logic", 462, 195, 270, 28, { fontSize: 19, bold: true, color: mint });
  textbox(s, "Source artifact model\nTransaction parser\nLifecycle and duplicate policy\nReporting-currency calculation", 462, 237, 285, 150, { fontSize: 20, color: white });
  textbox(s, "Quality baseline", 858, 195, 270, 28, { fontSize: 19, bold: true, color: mint });
  textbox(s, "Fictional JSON fixtures\nNode test runner\nTypeScript and ESLint\nBrowser-local persistence", 858, 237, 280, 150, { fontSize: 20, color: white });
  textbox(s, "Current limitation: the persistence layer uses browser local storage. The database role replaces that boundary for invited users while preserving the existing logic.", 82, 500, 1030, 52, { fontSize: 22, color: "#D7E9E5" });
  note(s, "Evidence: package.json; src/domain/canonical-capture.ts; src/parser/transaction-parser.ts; src/domain/transaction-lifecycle.ts; src/domain/review-persistence.ts. The deck intentionally does not choose a new database or auth provider before the team decides the constraints.");
}

// 6. Current money logic
{
  const s = deck.slides.add(); fill(s, cream); title(s, "The current logic protects against misleading totals", "The same rules must apply after the source and persistence become real", 6);
  bullet(s, "Replay protection", "The same source ID and event ID stays one economic event when processed again.", 80, 195, 320);
  bullet(s, "Duplicate caution", "Sparse or approximate matches remain visible and counted until a person explicitly resolves them.", 460, 195, 320);
  bullet(s, "Unknown means unknown", "An unclear event type has zero inflow or outflow effect until a person chooses Expense, Income, or Transfer.", 840, 195, 330);
  bullet(s, "Coverage stays visible", "Totals state their period, currency, source selection, and pending treatment. They do not claim a bank balance.", 80, 414, 320);
  bullet(s, "Source corrections reopen review", "Material new evidence returns a previously confirmed record to attention while retaining the person’s prior correction.", 460, 414, 320);
  bullet(s, "Deletion has to be honest", "Sprint 2 must specify what source data, decisions, and any replay-prevention marker remain after deletion.", 840, 414, 330);
  note(s, "Source: docs/product-contract.md, invariants and duplicate/evolution rules; docs/human-review-contract.md. These rules become integration acceptance checks.");
}

// 7 Sprint 2 scope
{
  const s = deck.slides.add(); fill(s, mist); title(s, "Sprint 2 builds one complete invited-user journey", "Keep the scope narrow enough to learn from real use", 7);
  textbox(s, "Invited access", 73, 205, 172, 30, { fontSize: 19, bold: true, color: navy });
  textbox(s, "Authorize Gmail or import one artifact", 265, 205, 240, 58, { fontSize: 18, bold: true, color: teal });
  textbox(s, "Detect and retain evidence", 540, 205, 210, 58, { fontSize: 18, bold: true, color: teal });
  textbox(s, "Review or correct", 790, 205, 170, 30, { fontSize: 19, bold: true, color: navy });
  textbox(s, "Return to saved decisions", 988, 205, 205, 58, { fontSize: 18, bold: true, color: teal });
  textbox(s, "Disconnect or delete", 490, 345, 310, 34, { fontSize: 22, bold: true, color: "#A65B3C" });
  textbox(s, "Source direction: time-box Gmail feasibility for one consented test-user pattern. If scope, coverage, or safe handling fails, use a clearly labelled user-initiated import. Import captures real supplied data but does not prove automatic capture.", 90, 450, 1050, 90, { fontSize: 21, color: ink });
  note(s, "Source: current Product & App State, Sprint 2 ready work mode. Google classifies gmail.readonly as restricted. Do not represent either Gmail or import as already implemented.");
}

// 8 Integration contract
{
  const s = deck.slides.add(); fill(s, white); title(s, "The integration contract keeps each role independent", "Every workstream produces a defined handoff and a checkable result", 8);
  textbox(s, "1  SOURCE PATH", 76, 184, 320, 28, { fontSize: 17, bold: true, color: teal });
  textbox(s, "Emits a source artifact with stable source and event IDs, received time, permitted payload or safe reference, and source-specific metadata.", 76, 220, 335, 124, { fontSize: 18, color: ink });
  textbox(s, "2  DOMAIN PIPELINE", 466, 184, 320, 28, { fontSize: 17, bold: true, color: teal });
  textbox(s, "Uses the existing eligibility, parser, lifecycle, duplicate, review, and metric rules. Unsupported input returns a reason, never a fabricated transaction.", 466, 220, 335, 124, { fontSize: 18, color: ink });
  textbox(s, "3  PRIVATE SERVICE", 856, 184, 320, 28, { fontSize: 17, bold: true, color: teal });
  textbox(s, "Stores records, review decisions, and deletion state under the invited user’s identity. Enforces separation between users and supports return visits.", 856, 220, 335, 124, { fontSize: 18, color: ink });
  textbox(s, "Integration rule", 76, 455, 205, 28, { fontSize: 18, bold: true, color: "#A65B3C" });
  textbox(s, "No role bypasses the domain pipeline. The source role does not calculate totals; the database role does not reinterpret messages; the interface never hides uncertainty or turns detected flow into a balance.", 76, 492, 1040, 60, { fontSize: 21, color: navy, bold: true });
  note(s, "Source: docs/product-contract.md source-agnostic capture boundary. Integration should use a testable SourceArtifact handoff into existing domain functions and a durable persistence adapter around existing review state.");
}

// 9 Gmail role
{
  const s = deck.slides.add(); fill(s, navy); title(s, "Role 1: Gmail capture pipeline", "Objective: bring one permitted transaction-message pattern into the existing source boundary", 9, true);
  textbox(s, "What this owner builds", 72, 177, 310, 28, { fontSize: 19, bold: true, color: mint });
  textbox(s, "• A feasibility note for one Gmail test-user path\n• Narrow search or retrieval for one supported sender/pattern\n• OAuth consent handling with the smallest feasible scope\n• Translation from Gmail data to SourceArtifact\n• Explicit unsupported, partial, and failed-capture outcomes", 72, 219, 500, 225, { fontSize: 18, color: white });
  textbox(s, "Handoff to the rest of the app", 676, 177, 390, 28, { fontSize: 19, bold: true, color: mint });
  textbox(s, "Provide stable source_id and source_event_id, received_at, safe content or reference, sender/subject only as source metadata, and an audit-safe reason when input cannot be processed. Do not place Gmail-specific fields in the shared candidate model.", 676, 219, 435, 164, { fontSize: 18, color: white });
  textbox(s, "Acceptance evidence", 676, 448, 360, 28, { fontSize: 19, bold: true, color: amber });
  textbox(s, "A named test user can consent; one matching message reaches the existing parser; an unrelated message produces no candidate; replay does not duplicate an event; errors tell the user what happened without exposing private message content.", 676, 488, 435, 105, { fontSize: 17, color: "#D7E9E5" });
  note(s, "Source: Sprint 2 plan and docs/product-contract.md. Gmail readonly is restricted. The owner should choose Gmail only after the short consent, coverage, and safe-handling feasibility check. Fallback: labelled user-initiated import.");
}

// 10 Database role
{
  const s = deck.slides.add(); fill(s, cream); title(s, "Role 2: invited identity and private persistence", "Objective: make review decisions durable and private for one invited person", 10);
  textbox(s, "What this owner builds", 72, 177, 320, 28, { fontSize: 19, bold: true, color: teal });
  textbox(s, "• An invited-user sign-in or access mechanism\n• A durable data model for users, source artifacts, transaction records, review decisions, and deletion status\n• User-level access checks on every read and write\n• A disconnect path that revokes future source access\n• A deletion path with clear retained-data behavior", 72, 219, 500, 225, { fontSize: 18, color: ink });
  textbox(s, "Data responsibilities", 676, 177, 360, 28, { fontSize: 19, bold: true, color: teal });
  textbox(s, "Persist raw source facts separately from interpretations and user overrides. Keep source identity for replay safety. Store only what the agreed source journey needs. Make user corrections and exclusion decisions returnable after sign-in.", 676, 219, 435, 150, { fontSize: 18, color: ink });
  textbox(s, "Acceptance evidence", 676, 430, 360, 28, { fontSize: 19, bold: true, color: "#A65B3C" });
  textbox(s, "User A cannot access User B’s record. A reviewed decision remains after sign-out and return. Disconnect stops future capture. Deletion removes the agreed data and explains any minimal replay-prevention marker that must remain.", 676, 470, 435, 96, { fontSize: 17, color: ink });
  note(s, "Source: Sprint 2 minimum scope and docs/human-review-contract.md. The exact database and identity provider are implementation choices after the team agrees storage, retention, deletion, and access requirements.");
}

// 11 Founder integration
{
  const s = deck.slides.add(); fill(s, mist); title(s, "Role 3: integration and product supervision", "Objective: turn two technical workstreams into one understandable, testable user journey", 11);
  bullet(s, "Own the product contract", "Choose the first user, supported source pattern, trust wording, money rules, coverage language, and the conditions that define success.", 74, 192, 325);
  bullet(s, "Run integration checkpoints", "Keep an example SourceArtifact, parsed candidate, saved record, and visible review result that both workstreams use during development.", 455, 192, 325);
  bullet(s, "Protect the experience", "Review consent, failure, coverage, correction, and deletion language. Confirm the mobile journey does not hide unresolved uncertainty.", 836, 192, 325);
  bullet(s, "Accept the sprint evidence", "Observe an invited non-builder. Record friction, corrections, help required, coverage understanding, and whether they return to their own record.", 74, 420, 325);
  bullet(s, "Coordinate quality", "Require source, persistence, and end-to-end checks before adding scope. Keep a decision log when a technical finding changes product scope.", 455, 420, 325);
  bullet(s, "Decide the next move", "Continue, revise, or stop based on observed use. A working OAuth callback or database table is intermediate evidence only.", 836, 420, 325);
  note(s, "Source: Sprint 2 ownership split in the Sprint Hub and Product & App State. Founder owns product/trust/UX/customer-validation acceptance rather than delegating core venture choices.");
}

// 12 plan & gates
{
  const s = deck.slides.add(); fill(s, white); title(s, "A small sequence prevents integration surprises", "Each stage produces evidence the next stage needs", 12);
  textbox(s, "1. Define", 78, 185, 180, 28, { fontSize: 22, bold: true, color: navy });
  textbox(s, "Choose one user, one source, and one message pattern. Write supported and unsupported fictional examples.", 78, 227, 205, 110, { fontSize: 17, color: ink });
  textbox(s, "2. Prove feasibility", 357, 185, 240, 28, { fontSize: 22, bold: true, color: navy });
  textbox(s, "Check Gmail consent, scope, coverage, and data handling. Choose Gmail or user-initiated import.", 357, 227, 220, 110, { fontSize: 17, color: ink });
  textbox(s, "3. Build the thin path", 670, 185, 270, 28, { fontSize: 22, bold: true, color: navy });
  textbox(s, "Connect source capture, existing domain logic, private storage, review, return visit, disconnect, and deletion.", 670, 227, 240, 110, { fontSize: 17, color: ink });
  textbox(s, "4. Observe", 1010, 185, 180, 28, { fontSize: 22, bold: true, color: navy });
  textbox(s, "Watch an invited non-builder complete the journey. Record failures and comprehension.", 1010, 227, 180, 110, { fontSize: 17, color: ink });
  textbox(s, "Sprint 2 passes when an invited non-builder completes the whole journey, explains what was and was not detected, returns to their own record, and can disconnect or delete.", 86, 485, 1050, 56, { fontSize: 25, bold: true, color: teal });
  note(s, "Source: Sprint 2 exit gate from Product & App State. This is the lightweight V-model: requirements are paired with direct checks, including wrong-account access, replay, unsupported input, disconnect, deletion, and user understanding.");
}

// 13 Close
{
  const s = deck.slides.add(); fill(s, navy); title(s, "Decisions needed today", "The sprint starts with a shared boundary, not a large feature list", 13, true);
  textbox(s, "1", 78, 202, 45, 40, { fontSize: 31, bold: true, color: amber });
  textbox(s, "Confirm named owners and available hours", 145, 204, 900, 36, { fontSize: 24, bold: true, color: white });
  textbox(s, "2", 78, 292, 45, 40, { fontSize: 31, bold: true, color: amber });
  textbox(s, "Choose the first user, source, and supported message pattern", 145, 294, 950, 36, { fontSize: 24, bold: true, color: white });
  textbox(s, "3", 78, 382, 45, 40, { fontSize: 31, bold: true, color: amber });
  textbox(s, "Agree the Gmail feasibility deadline and import fallback", 145, 384, 920, 36, { fontSize: 24, bold: true, color: white });
  textbox(s, "4", 78, 472, 45, 40, { fontSize: 31, bold: true, color: amber });
  textbox(s, "Agree the integration contract and the first acceptance examples", 145, 474, 960, 36, { fontSize: 24, bold: true, color: white });
  textbox(s, "The first build should be small enough to demonstrate end to end in one team session.", 80, 600, 1030, 30, { fontSize: 20, color: "#B8D7D2" });
  note(s, "Close by assigning names to the Gmail source-path owner and database/identity owner, confirming the founder as integration lead, and setting the first scope decision checkpoint.");
}

await fs.mkdir(path.join(workspaceDir, ".codex-finalizer"), { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
const candidatePath = path.join(workspaceDir, ".codex-finalizer/financeapp-sprint2-candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const requirements = { explicitTotalSlideCount: 13, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [] };
await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: process.env.RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(workspaceDir, ".codex-finalizer/financeapp-sprint2-deck.validation.json"),
});
console.log(FINAL_PPTX);
