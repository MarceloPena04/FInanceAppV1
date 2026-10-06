import type { CanonicalCapture } from "../domain/canonical-capture";
import type {
  CandidateStatus,
  SourceDerivedFacts,
  SystemInferredFields,
} from "../domain/transaction-candidate";

export interface ExpectedCandidate {
  status: CandidateStatus;
  sourceFacts: SourceDerivedFacts;
  inferred: SystemInferredFields;
}

export type FixtureExpectation =
  | { outcome: "candidate"; candidate: ExpectedCandidate }
  | { outcome: "no_candidate"; reason: string };

export interface CaptureFixtureRecord {
  id: string;
  capture: CanonicalCapture;
  expected: FixtureExpectation;
  relationship?: {
    kind: "exact_duplicate_of" | "same_conceptual_transaction";
    group: string;
  };
}

export interface CaptureFixtureDocument {
  schemaVersion: 1;
  records: CaptureFixtureRecord[];
}
