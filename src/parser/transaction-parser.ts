import type { CanonicalCapture } from "../domain/canonical-capture";
import type {
  SourceDerivedFacts,
  SourceEvidence,
  ObservedFundingSource,
  TransactionCandidate,
  TransactionKind,
} from "../domain/transaction-candidate";

export interface TransactionParser {
  parse(capture: CanonicalCapture): TransactionCandidate | undefined;
}

export interface TransactionParserOptions {
  /** Injected by tests so processing traceability does not depend on wall-clock time. */
  now?: () => Date;
}

interface ExtractedAmount {
  amountMinor: number;
  currency?: string;
  evidence: SourceEvidence[];
}

interface ExtractedText {
  value: string;
  evidence: SourceEvidence;
}

interface ExtractedKind {
  kind: TransactionKind;
  evidence: SourceEvidence;
}

const FINANCIAL_EVENT_SIGNALS = /\b(purchase(?:\s+confirmed)?\s*:|purchase confirmed|payment completed|transaction (?:completed|finalized|reversed)|refund (?:issued|posted)|(?:credit|deposit) received|transfer sent|cash withdrawal|paid to|charged by|pending authorization)/i;
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"]);

function amountMinor(value: string, currency?: string): number {
  const [whole, fractional = ""] = value.split(".");
  if (currency && ZERO_DECIMAL_CURRENCIES.has(currency)) return Number(whole);
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0").slice(0, 2));
}

function extractAmount(text: string): ExtractedAmount | undefined {
  const currencyMatch = /\b([A-Z]{3})\s+(\d+(?:\.\d{1,2})?)\b/.exec(text);
  if (currencyMatch) {
    const [, currency, value] = currencyMatch;
    const excerpt = currencyMatch[0];
    return {
      amountMinor: amountMinor(value, currency),
      currency,
      evidence: [
        { field: "amount", excerpt },
        { field: "currency", excerpt: currency },
      ],
    };
  }

  const uncodedAmount = /\b(?:payment|transaction)\s+(?:completed|confirmed)\s*:\s*(\d+\.\d{1,2})\b/i.exec(text);
  if (!uncodedAmount) return undefined;

  return {
    amountMinor: amountMinor(uncodedAmount[1]),
    evidence: [{ field: "amount", excerpt: uncodedAmount[1] }],
  };
}

function extractMerchant(text: string): ExtractedText | undefined {
  const match = /\b(?:at|paid to|from|to|charged by|posted by)\s+(.+?)(?:\s+on\s+\d{4}-\d{2}-\d{2}|[.!]|$)/i.exec(text);
  if (!match) return undefined;

  const value = match[1].trim();
  if (!value) return undefined;
  return { value, evidence: { field: "merchantText", excerpt: value } };
}

function extractOccurredAt(text: string): ExtractedText | undefined {
  const timestamp = /\b(20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\b/.exec(text);
  if (timestamp) return { value: timestamp[1], evidence: { field: "occurredAt", excerpt: timestamp[1] } };

  const match = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(text);
  if (!match) return undefined;

  return {
    // A calendar date is not a claimed midnight transaction time.
    value: match[1],
    evidence: { field: "occurredAt", excerpt: match[1] },
  };
}

function extractKind(text: string, financialSignal: string): ExtractedKind {
  // This is deliberately narrower than a general "payment completed" phrase:
  // the source must state an amount paid at a named merchant. That gives the
  // fictional review flow a source-backed purchase direction without turning
  // unrelated completion notices into expenses.
  const completedPaymentAtMerchant = /\bpayment completed\s*:\s*(?:[A-Z]{3}\s+)?\d+(?:\.\d{1,2})?\s+at\s+[^.!\n]+/i.exec(text);
  if (completedPaymentAtMerchant) {
    return { kind: "purchase", evidence: { field: "kind", excerpt: completedPaymentAtMerchant[0] } };
  }

  const recognizedKinds: Array<[RegExp, TransactionKind]> = [
    [/\brefund (?:issued|posted)\b/i, "refund"],
    [/\b(?:credit|deposit) received\b/i, "income"],
    [/\b(?:card )?transaction reversed\b/i, "reversal"],
    [/\bcash withdrawal\b/i, "withdrawal"],
    [/\btransfer sent\b/i, "transfer"],
    [/\b(?:purchase confirmed|purchase|paid to|charged by|pending authorization|transaction finalized)\b/i, "purchase"],
  ];

  for (const [pattern, kind] of recognizedKinds) {
    const match = pattern.exec(text);
    if (match) return { kind, evidence: { field: "kind", excerpt: match[0] } };
  }

  return { kind: "unknown", evidence: { field: "kind", excerpt: financialSignal } };
}

/** Only labelled source text or explicit adapter metadata supplies a funding source. */
function extractFundingSource(capture: CanonicalCapture): { value?: ObservedFundingSource; evidence: SourceEvidence[] } {
  const fields: Array<{ key: keyof ObservedFundingSource; label: SourceEvidence["field"]; pattern: RegExp; metadata?: string }> = [
    { key: "institution", label: "institution", pattern: /\bBank:\s*([^.;\n]+)/i, metadata: capture.metadata.institutionName },
    { key: "account", label: "account", pattern: /\bAccount ending\s*([0-9]{2,4})\b/i, metadata: capture.metadata.accountReference },
    { key: "card", label: "card", pattern: /\bCard ending\s*([0-9]{2,4})\b/i, metadata: capture.metadata.paymentInstrumentReference },
  ];
  const value: ObservedFundingSource = {};
  const evidence: SourceEvidence[] = [];
  for (const field of fields) {
    const match = field.pattern.exec(capture.rawText);
    if (match) {
      value[field.key] = field.key === "institution" ? match[1].trim() : `••${match[1]}`;
      evidence.push({ field: field.label, excerpt: match[0], origin: "text" });
    } else if (field.metadata) {
      value[field.key] = field.key === "institution" ? field.metadata : field.metadata.match(/\d{2,4}$/) ? `••${field.metadata.match(/\d{2,4}$/)?.[0]}` : "reference supplied";
    }
    if (field.metadata) evidence.push({ field: field.label, excerpt: `metadata.${field.key}: ${field.metadata}`, origin: "metadata" });
  }
  return { ...(Object.keys(value).length && { value }), evidence };
}

/**
 * Parses only explicit source text. It deliberately has no database, provider,
 * categorization, duplicate, or reconciliation knowledge.
 */
export function createTransactionParser(options: TransactionParserOptions = {}): TransactionParser {
  const now = options.now ?? (() => new Date());

  return {
    parse(capture) {
      const financialSignal = FINANCIAL_EVENT_SIGNALS.exec(capture.rawText);
      if (!financialSignal) return undefined;

      const amount = extractAmount(capture.rawText);
      const merchant = extractMerchant(capture.rawText);
      const occurredAt = extractOccurredAt(capture.rawText);
      const kind = extractKind(capture.rawText, financialSignal[0]);
      const fundingSource = extractFundingSource(capture);
      const evidence = [
        ...(amount?.evidence ?? []),
        ...(merchant ? [merchant.evidence] : []),
        ...(occurredAt ? [occurredAt.evidence] : []),
        kind.evidence,
        ...fundingSource.evidence,
      ];
      const sourceFacts: SourceDerivedFacts = {
        ...(amount && { amountMinor: amount.amountMinor }),
        ...(amount?.currency && { currency: amount.currency }),
        ...(merchant && { merchantText: merchant.value }),
        ...(occurredAt && { occurredAt: occurredAt.value }),
        kind: kind.kind,
        ...(fundingSource.value && { fundingSource: fundingSource.value }),
        evidence,
      };

      return {
        candidateId: `candidate:${capture.captureId}`,
        captureId: capture.captureId,
        ...(capture.capturedAt && { capturedAt: capture.capturedAt }),
        processedAt: now().toISOString(),
        status: amount ? "detected" : "incomplete",
        reviewStatus: "pending",
        sourceFacts,
        inferred: {},
      };
    },
  };
}
