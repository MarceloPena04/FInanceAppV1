/**
 * A source-agnostic artifact before any transaction facts have been extracted.
 * Source adapters are responsible for populating this shape.
 */
export type CaptureSourceType =
  | "email"
  | "push_notification"
  | "fixture"
  | "other";

export type CaptureMetadataValue = string | number | boolean | null;

export interface CanonicalCapture {
  /** Unique identifier generated when the artifact enters this application. */
  captureId: string;
  sourceType: CaptureSourceType;
  provider?: string;
  /** When this artifact was captured or ingested, if the source supplied it. */
  capturedAt?: string;
  rawText: string;
  metadata: {
    externalId?: string;
    /** A source-supplied transaction/reference identity, when it has one. */
    transactionReference?: string;
    /** A source-supplied account or payment-instrument identity, when safe to retain. */
    accountReference?: string;
    paymentInstrumentReference?: string;
    /** The institution named by the source, distinct from the delivery provider. */
    institutionName?: string;
    sender?: string;
    subject?: string;
    applicationId?: string;
    packageId?: string;
    channel?: string;
    [key: string]: CaptureMetadataValue | undefined;
  };
}
