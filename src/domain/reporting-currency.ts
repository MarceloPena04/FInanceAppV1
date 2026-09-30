import { effectiveValues, groupingDate, type TransactionLifecycle } from "./transaction-lifecycle.ts";

export const REPORTING_RATE_VERSION = "fictional-demo-2026-09-30";
export const SUPPORTED_REPORTING_CURRENCIES = ["EUR", "USD", "MXN", "JPY"] as const;
export type ReportingCurrency = typeof SUPPORTED_REPORTING_CURRENCIES[number];

const minorUnits: Record<ReportingCurrency, number> = { EUR: 100, USD: 100, MXN: 100, JPY: 1 };
/** Major units of each currency expressed in fictional EUR. */
const toEur: Record<ReportingCurrency, { numerator: number; denominator: number; display: string }> = {
  EUR: { numerator: 1, denominator: 1, display: "1.00" },
  USD: { numerator: 92, denominator: 100, display: "0.92" },
  MXN: { numerator: 5, denominator: 100, display: "0.05" },
  JPY: { numerator: 6, denominator: 1000, display: "0.006" },
};

function roundRatio(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

export interface ConversionResult {
  sourceAmountMinor: number;
  sourceCurrency: ReportingCurrency;
  reportingAmountMinor: number;
  reportingCurrency: ReportingCurrency;
  rateNumerator: string;
  rateDenominator: string;
  rateLabel: string;
  version: string;
}

export function convertMinor(amountMinor: number, sourceCurrency: string, reportingCurrency: string): ConversionResult | undefined {
  if (!SUPPORTED_REPORTING_CURRENCIES.includes(sourceCurrency as ReportingCurrency) || !SUPPORTED_REPORTING_CURRENCIES.includes(reportingCurrency as ReportingCurrency)) return undefined;
  const source = sourceCurrency as ReportingCurrency;
  const target = reportingCurrency as ReportingCurrency;
  const numerator = toEur[source].numerator * toEur[target].denominator;
  const denominator = toEur[source].denominator * toEur[target].numerator;
  const converted = roundRatio(amountMinor * numerator * minorUnits[target], denominator * minorUnits[source]);
  return {
    sourceAmountMinor: amountMinor,
    sourceCurrency: source,
    reportingAmountMinor: converted,
    reportingCurrency: target,
    rateNumerator: numerator.toString(),
    rateDenominator: denominator.toString(),
    rateLabel: source === target ? "1.00" : `${toEur[source].display} EUR ÷ ${toEur[target].display} EUR`,
    version: REPORTING_RATE_VERSION,
  };
}

export interface ReportingEventEffect {
  recordId: string;
  included: boolean;
  reason: "included" | "outside_week" | "excluded" | "duplicate" | "missing_value" | "neutral";
  inflowMinor: number;
  outflowMinor: number;
  provisionalOutflowMinor: number;
  pendingAmountMinor: number;
  conversion?: ConversionResult;
}

function isInWeek(record: TransactionLifecycle, weekStart?: string): boolean {
  if (!weekStart) return true;
  const value = groupingDate(record).value;
  if (!value) return false;
  const instant = new Date(value.length === 10 ? `${value}T00:00:00Z` : value).getTime();
  const start = new Date(`${weekStart}T00:00:00Z`).getTime();
  return Number.isFinite(instant) && instant >= start && instant < start + 604800000;
}

export function reportingEventEffect(record: TransactionLifecycle, reportingCurrency: ReportingCurrency, weekStart?: string): ReportingEventEffect {
  const empty = (reason: ReportingEventEffect["reason"]): ReportingEventEffect => ({ recordId: record.id, included: false, reason, inflowMinor: 0, outflowMinor: 0, provisionalOutflowMinor: 0, pendingAmountMinor: 0 });
  if (!isInWeek(record, weekStart)) return empty("outside_week");
  if (record.disposition === "excluded" || record.deletionState !== "active") return empty("excluded");
  if (record.relationships.some(item => item.kind === "duplicate_of")) return empty("duplicate");
  const value = effectiveValues(record);
  if (value.amountMinor === undefined || !value.currency) return empty("missing_value");
  const conversion = convertMinor(value.amountMinor, value.currency, reportingCurrency);
  if (!conversion) return empty("missing_value");
  const amount = conversion.reportingAmountMinor;
  const pending = record.confirmationState === "needs_confirmation";
  if (value.eventType === "purchase" || value.eventType === "generic_expense") return { recordId: record.id, included: true, reason: "included", inflowMinor: 0, outflowMinor: amount, provisionalOutflowMinor: 0, pendingAmountMinor: pending ? amount : 0, conversion };
  if (value.eventType === "income" || value.eventType === "refund" || value.eventType === "reversal") return { recordId: record.id, included: true, reason: "included", inflowMinor: amount, outflowMinor: 0, provisionalOutflowMinor: 0, pendingAmountMinor: pending ? amount : 0, conversion };
  if (value.eventType === "unknown") return { recordId: record.id, included: true, reason: "included", inflowMinor: 0, outflowMinor: 0, provisionalOutflowMinor: amount, pendingAmountMinor: pending ? amount : 0, conversion };
  return { ...empty("neutral"), conversion };
}

export interface ReportingMetrics {
  currency: ReportingCurrency;
  inflowMinor: number;
  outflowMinor: number;
  netFlowMinor: number;
  provisionalOutflowMinor: number;
  pendingCount: number;
  pendingAmountMinor: number;
  effects: ReportingEventEffect[];
}

export function calculateReportingMetrics(records: TransactionLifecycle[], reportingCurrency: ReportingCurrency, weekStart?: string): ReportingMetrics {
  const effects = records.map(record => reportingEventEffect(record, reportingCurrency, weekStart));
  const included = effects.filter(effect => effect.included);
  const inflowMinor = included.reduce((sum, effect) => sum + effect.inflowMinor, 0);
  const outflowMinor = included.reduce((sum, effect) => sum + effect.outflowMinor, 0);
  return {
    currency: reportingCurrency,
    inflowMinor,
    outflowMinor,
    netFlowMinor: inflowMinor - outflowMinor,
    provisionalOutflowMinor: included.reduce((sum, effect) => sum + effect.provisionalOutflowMinor, 0),
    pendingCount: included.filter(effect => effect.pendingAmountMinor > 0).length,
    pendingAmountMinor: included.reduce((sum, effect) => sum + effect.pendingAmountMinor, 0),
    effects,
  };
}
