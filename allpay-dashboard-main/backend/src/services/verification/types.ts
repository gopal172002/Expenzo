export type CheckSeverity = "info" | "low" | "medium" | "high" | "critical";

export type CheckOutcome = "pass" | "warn" | "fail" | "skipped";

/** One rule's verdict on a claim, written so an admin can act on it without reading code. */
export type VerificationCheck = {
  id: string;
  label: string;
  outcome: CheckOutcome;
  severity: CheckSeverity;
  /** 0-100 contribution before weighting. 0 means fully clean. */
  riskPoints: number;
  weight: number;
  /** Shown verbatim in the dashboard and to the employee. */
  explanation: string;
  evidence?: Record<string, unknown>;
};

export type VerificationVerdict = "verified" | "low_risk" | "needs_review" | "high_risk";

export type VerificationResult = {
  riskScore: number;
  verdict: VerificationVerdict;
  verdictLabel: string;
  /** How much of the score rests on hard evidence rather than heuristics. */
  evidenceStrength: "transaction_matched" | "partial_evidence" | "heuristic_only";
  headline: string;
  checks: VerificationCheck[];
  failedCheckIds: string[];
  evaluatedAt: string;
};

export const VERDICT_LABELS: Record<VerificationVerdict, string> = {
  verified: "Verified by AllPay payment",
  low_risk: "Low risk",
  needs_review: "Needs review",
  high_risk: "High risk",
};

export function verdictFromScore(score: number, matched: boolean): VerificationVerdict {
  if (matched && score <= 20) return "verified";
  if (score <= 25) return "low_risk";
  if (score <= 60) return "needs_review";
  return "high_risk";
}

export const SEVERITY_ORDER: Record<CheckSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
