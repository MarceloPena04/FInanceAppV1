export type TransactionKind =
  | "purchase"
  | "refund"
  | "income"
  | "reversal"
  | "withdrawal"
  | "transfer"
  | "unknown";

export type CandidateStatus =
  | "detected"
  | "incomplete"
  | "duplicate"
  | "pending_authorization"
  | "finalized"
  | "reversed"
  | "unsupported";

export type CandidateReviewStatus =
  | "pending"
  | "accepted"
  | "corrected"
  | "excluded";

/**
 * The parser result is deliberately separate from the review lifecycle. A
 * detected result says that source evidence and an amount were found; it does
 * not mean that a person has confirmed it or that it has settled.
 */
export type CandidateConfirmationState = "needs_confirmation" | "confirmed";
export type CandidateDisposition = "active" | "excluded";
export type CandidateSettlementState = "unknown" | "pending" | "finalized";

export interface SourceEvidence {
  field: "amount" | "currency" | "occurredAt" | "merchantText" | "kind" | "institution" | "account" | "card";
  excerpt: string;
  origin?: "text" | "metadata";
}

export interface ObservedFundingSource {
  institution?: string;
  account?: string;
  card?: string;
}

/** Facts copied from a source. Omit a field when that fact is unavailable. */
export interface SourceDerivedFacts {
  amountMinor?: number;
  currency?: string;
  occurredAt?: string;
  merchantText?: string;
  kind?: TransactionKind;
  fundingSource?: ObservedFundingSource;
  evidence: SourceEvidence[];
}

/** Fields the system may suggest without changing the source-derived facts. */
export interface SystemInferredFields {
  suggestedTitle?: string;
  suggestedCategory?: string;
  confidence?: "high" | "medium" | "low";
  reviewReason?: string;
}

export interface TransactionCandidate {
  candidateId: string;
  captureId: string;
  /** Preserved capture/ingestion time. It is never fabricated by the parser. */
  capturedAt?: string;
  /** Time at which this parser processed the capture. */
  processedAt: string;
  status: CandidateStatus;
  reviewStatus: CandidateReviewStatus;
  sourceFacts: SourceDerivedFacts;
  inferred: SystemInferredFields;
}
