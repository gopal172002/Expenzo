import dayjs from "dayjs";
import { normalizeCategory } from "../policyEvaluationService";
import type { VerificationCheck } from "./types";

export type ClaimContext = {
  id: string;
  employeeId: string;
  /** Required for multi-company isolation (emp1 can exist in many tenants). */
  companyId?: string;
  employeeName: string;
  department: string;
  merchantName: string;
  category: string;
  mcc: string;
  amount: number;
  claimedAmount: number;
  dateTime: string;
  upiRefId?: string;
  receiptFraudScore?: number;
  receiptFraudTier?: string;
  receiptUrl?: string;
};

export type AllpayPayment = {
  id: string;
  employeeId: string;
  amountPaise: number;
  payeeName: string;
  category?: string;
  mcc?: string;
  status: string;
  initiatedAt: string;
  completedAt?: string;
};

export type PriorClaim = {
  id: string;
  employeeId: string;
  merchantName: string;
  category: string;
  amount: number;
  dateTime: string;
  upiRefId?: string;
  status: string;
};

export type AttendanceDay = {
  employeeId: string;
  date: string;
  punchIn?: string;
  punchOut?: string;
  workLocation: string;
};

/** Spend that can only happen away from the workplace. */
const TRANSIT_CATEGORIES = new Set(["travel", "commute"]);
/** Spend that is movement-related but can legitimately happen around a work day. */
const SOFT_MOVEMENT_CATEGORIES = new Set(["fuel", "lodging"]);

const TRANSIT_MERCHANT_HINTS = [
  "metro",
  "uber",
  "ola",
  "rapido",
  "irctc",
  "railway",
  "toll",
  "cab",
  "taxi",
  "bus",
];

const SOFT_MOVEMENT_MERCHANT_HINTS = [
  "petrol",
  "fuel",
  "indian oil",
  "hp ",
  "bharat petroleum",
  "shell",
  "hotel",
  "oyo",
];

const SUCCESSFUL_PAYMENT_STATUSES = new Set([
  "SUCCESS_REPORTED",
  "USER_CONFIRMED",
  "payment_captured",
]);

function paise(amount: number): number {
  return Math.round(amount * 100);
}

function withinPercent(a: number, b: number, percent: number): boolean {
  if (a === 0 && b === 0) return true;
  const larger = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) / larger <= percent / 100;
}

function money(amount: number): string {
  return `Rs.${amount.toLocaleString("en-IN")}`;
}

function normalizeMerchant(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(pvt|ltd|limited|india|private|inc|llp|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Merchant names differ between the payment rail and the receipt, so compare on
 * shared significant tokens. A naive prefix match would treat "Indian Oil" and
 * "Indian Railways" as the same payee and raise a false amount mismatch.
 */
export function merchantsLikelySame(a: string, b: string): boolean {
  const left = normalizeMerchant(a);
  const right = normalizeMerchant(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(" ").filter((token) => token.length >= 4));
  const rightTokens = right.split(" ").filter((token) => token.length >= 4);
  const shared = rightTokens.filter((token) => leftTokens.has(token));
  // One shared word is weak ("Indian"); require either two, or a single distinctive one.
  if (shared.length >= 2) return true;
  return shared.length === 1 && shared[0]!.length >= 7;
}

function movementKind(claim: ClaimContext): "transit" | "soft" | "none" {
  const category = normalizeCategory(claim.category);
  const merchant = claim.merchantName.toLowerCase();
  if (TRANSIT_CATEGORIES.has(category) || TRANSIT_MERCHANT_HINTS.some((h) => merchant.includes(h))) {
    return "transit";
  }
  if (
    SOFT_MOVEMENT_CATEGORIES.has(category) ||
    SOFT_MOVEMENT_MERCHANT_HINTS.some((h) => merchant.includes(h))
  ) {
    return "soft";
  }
  return "none";
}

/**
 * Strongest signal available: AllPay already recorded this spend, so the claim is
 * corroborated by payment rails rather than by reading the receipt image.
 */
export function checkAllpayMatch(claim: ClaimContext, payments: AllpayPayment[]): VerificationCheck {
  const base = {
    id: "allpay_match",
    label: "AllPay payment match",
    weight: 3,
  };

  const settled = payments.filter((p) => SUCCESSFUL_PAYMENT_STATUSES.has(p.status));
  if (settled.length === 0) {
    return {
      ...base,
      outcome: "warn",
      severity: "medium",
      riskPoints: 45,
      explanation:
        "No AllPay payment was found for this employee near the claim date, so the amount cannot be confirmed against payment records. Manual proof is required.",
      evidence: { candidatePayments: payments.length },
    };
  }

  const claimTime = dayjs(claim.dateTime);
  const claimPaise = paise(claim.claimedAmount || claim.amount);

  const nearby = settled.filter(
    (p) => Math.abs(dayjs(p.completedAt ?? p.initiatedAt).diff(claimTime, "hour")) <= 72
  );

  const exact = nearby.find(
    (p) => p.amountPaise === claimPaise || withinPercent(p.amountPaise, claimPaise, 1)
  );
  if (exact) {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: `Matched AllPay payment ${exact.id} of ${money(exact.amountPaise / 100)} to ${exact.payeeName}. The claimed amount is confirmed by payment records.`,
      evidence: {
        paymentId: exact.id,
        paidAmount: exact.amountPaise / 100,
        paidAt: exact.completedAt ?? exact.initiatedAt,
      },
    };
  }

  const sameMerchant = nearby.find((p) => merchantsLikelySame(p.payeeName, claim.merchantName));
  if (sameMerchant) {
    const paid = sameMerchant.amountPaise / 100;
    const claimed = claimPaise / 100;
    const difference = claimed - paid;
    return {
      ...base,
      outcome: "fail",
      severity: difference > 0 ? "critical" : "high",
      riskPoints: difference > 0 ? 95 : 70,
      explanation:
        difference > 0
          ? `AllPay recorded ${money(paid)} at ${sameMerchant.payeeName}, but the claim is for ${money(claimed)}. The claim is ${money(difference)} higher than the amount actually paid.`
          : `AllPay recorded ${money(paid)} at ${sameMerchant.payeeName}, which does not match the claimed ${money(claimed)}.`,
      evidence: { paymentId: sameMerchant.id, paidAmount: paid, claimedAmount: claimed, difference },
    };
  }

  return {
    ...base,
    outcome: "warn",
    severity: "medium",
    riskPoints: 40,
    explanation: `This employee made ${settled.length} AllPay payment(s), but none match this claim's amount or merchant within 72 hours. The spend was likely made outside AllPay.`,
    evidence: { settledPayments: settled.length },
  };
}

/** Same spend submitted twice, whether by accident or on purpose. */
export function checkDuplicateClaim(claim: ClaimContext, priors: PriorClaim[]): VerificationCheck {
  const base = { id: "duplicate_claim", label: "Duplicate claim", weight: 2 };
  const others = priors.filter((p) => p.id !== claim.id && p.status !== "rejected");

  if (claim.upiRefId) {
    const sameRef = others.find((p) => p.upiRefId && p.upiRefId === claim.upiRefId);
    if (sameRef) {
      return {
        ...base,
        outcome: "fail",
        severity: "critical",
        riskPoints: 100,
        explanation: `Claim ${sameRef.id} already uses UPI reference ${claim.upiRefId}. The same payment cannot be reimbursed twice.`,
        evidence: { duplicateOf: sameRef.id, upiRefId: claim.upiRefId },
      };
    }
  }

  const claimTime = dayjs(claim.dateTime);
  const nearDuplicate = others.find(
    (p) =>
      merchantsLikelySame(p.merchantName, claim.merchantName) &&
      Math.abs(p.amount - claim.amount) <= 1 &&
      Math.abs(dayjs(p.dateTime).diff(claimTime, "day")) <= 7
  );
  if (nearDuplicate) {
    return {
      ...base,
      outcome: "fail",
      severity: "high",
      riskPoints: 80,
      explanation: `Claim ${nearDuplicate.id} covers the same merchant and amount (${money(nearDuplicate.amount)}) on ${dayjs(nearDuplicate.dateTime).format("DD MMM YYYY")}. Confirm this is a separate spend.`,
      evidence: { duplicateOf: nearDuplicate.id, amount: nearDuplicate.amount },
    };
  }

  return {
    ...base,
    outcome: "pass",
    severity: "info",
    riskPoints: 0,
    explanation: "No earlier claim matches this merchant, amount, and date window.",
  };
}

/**
 * The metro-ticket-while-at-the-office case: a travel claim timestamped inside a
 * shift the employee spent at their work location.
 */
export function checkAttendanceConflict(
  claim: ClaimContext,
  attendance: AttendanceDay | null
): VerificationCheck {
  const base = { id: "attendance_conflict", label: "Attendance conflict", weight: 2.5 };

  if (!attendance) {
    return {
      ...base,
      outcome: "skipped",
      severity: "info",
      riskPoints: 0,
      explanation: "No attendance record was available for this date, so the claim time could not be cross-checked.",
    };
  }
  const kind = movementKind(claim);
  if (kind === "none") {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: "This category does not depend on the employee being away from their work location.",
    };
  }
  if (attendance.workLocation !== "office") {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: `Employee was logged as ${attendance.workLocation} on this date, which is consistent with a travel expense.`,
      evidence: { workLocation: attendance.workLocation },
    };
  }
  if (!attendance.punchIn || !attendance.punchOut) {
    return {
      ...base,
      outcome: "skipped",
      severity: "info",
      riskPoints: 0,
      explanation: "Attendance exists for this date but has no punch-in and punch-out pair to compare against.",
    };
  }

  const claimTime = dayjs(claim.dateTime);
  const punchIn = dayjs(attendance.punchIn);
  const punchOut = dayjs(attendance.punchOut);
  const insideShift = claimTime.isAfter(punchIn) && claimTime.isBefore(punchOut);

  if (!insideShift) {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: `Claim time ${claimTime.format("HH:mm")} falls outside the office shift ${punchIn.format("HH:mm")}–${punchOut.format("HH:mm")}.`,
    };
  }

  if (kind === "soft") {
    // Refuelling or a hotel booking during a work day is unusual but not impossible,
    // so this is raised for a look rather than treated as a contradiction.
    return {
      ...base,
      outcome: "warn",
      severity: "low",
      riskPoints: 35,
      explanation: `The employee was at the office from ${punchIn.format("HH:mm")} to ${punchOut.format("HH:mm")} when this ${claim.category.toLowerCase()} spend was recorded at ${claimTime.format("HH:mm")}. That can be legitimate, but it is worth confirming.`,
      evidence: {
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        claimTime: claim.dateTime,
      },
    };
  }

  return {
    ...base,
    outcome: "fail",
    severity: "high",
    riskPoints: 85,
    explanation: `The employee was punched in at the office from ${punchIn.format("HH:mm")} to ${punchOut.format("HH:mm")} on ${claimTime.format("DD MMM YYYY")}, but this ${claim.category.toLowerCase()} claim is timestamped ${claimTime.format("HH:mm")}. A travel expense during office hours needs an explanation.`,
    evidence: {
      punchIn: attendance.punchIn,
      punchOut: attendance.punchOut,
      claimTime: claim.dateTime,
      workLocation: attendance.workLocation,
    },
  };
}

/** Spend timestamped in the future, long past the window, or at implausible hours. */
export function checkTiming(claim: ClaimContext, now = dayjs()): VerificationCheck {
  const base = { id: "timing_anomaly", label: "Timing", weight: 1 };
  const claimTime = dayjs(claim.dateTime);

  if (claimTime.isAfter(now.add(1, "hour"))) {
    return {
      ...base,
      outcome: "fail",
      severity: "critical",
      riskPoints: 100,
      explanation: `The claim is dated ${claimTime.format("DD MMM YYYY HH:mm")}, which is in the future. Receipt dates cannot be later than today.`,
      evidence: { claimTime: claim.dateTime },
    };
  }

  const ageDays = now.diff(claimTime, "day");
  if (ageDays > 90) {
    return {
      ...base,
      outcome: "warn",
      severity: "medium",
      riskPoints: 45,
      explanation: `This spend is ${ageDays} days old. Most reimbursement windows close after 90 days.`,
      evidence: { ageDays },
    };
  }

  const hour = claimTime.hour();
  if (hour >= 1 && hour <= 4) {
    return {
      ...base,
      outcome: "warn",
      severity: "low",
      riskPoints: 30,
      explanation: `Timestamped ${claimTime.format("HH:mm")}, which is outside normal working hours. Not wrong on its own, but worth a look alongside other signals.`,
      evidence: { hour },
    };
  }

  return {
    ...base,
    outcome: "pass",
    severity: "info",
    riskPoints: 0,
    explanation: "Claim date and time are within the normal reimbursement window.",
  };
}

/** Amount far outside what this employee normally spends in this category. */
export function checkAmountAnomaly(claim: ClaimContext, priors: PriorClaim[]): VerificationCheck {
  const base = { id: "amount_anomaly", label: "Amount pattern", weight: 1.5 };
  const category = normalizeCategory(claim.category);
  const history = priors.filter(
    (p) => p.id !== claim.id && normalizeCategory(p.category) === category && p.status === "approved"
  );

  if (history.length < 3) {
    return {
      ...base,
      outcome: "skipped",
      severity: "info",
      riskPoints: 0,
      explanation: `Only ${history.length} approved ${claim.category} claim(s) on record, which is too few to judge whether this amount is unusual.`,
      evidence: { sampleSize: history.length },
    };
  }

  const amounts = history.map((p) => p.amount);
  const mean = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const amount = claim.claimedAmount || claim.amount;

  if (stdDev === 0) {
    if (amount > mean * 2) {
      return {
        ...base,
        outcome: "warn",
        severity: "medium",
        riskPoints: 50,
        explanation: `Previous ${claim.category} claims were consistently ${money(mean)}. This one is ${money(amount)}.`,
        evidence: { mean, amount },
      };
    }
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: `Amount is in line with previous ${claim.category} claims.`,
    };
  }

  const zScore = (amount - mean) / stdDev;
  if (zScore >= 3) {
    return {
      ...base,
      outcome: "fail",
      severity: "high",
      riskPoints: 75,
      explanation: `${money(amount)} is far above this employee's usual ${claim.category} spend of about ${money(Math.round(mean))}. That is ${zScore.toFixed(1)} standard deviations out.`,
      evidence: { mean: Math.round(mean), stdDev: Math.round(stdDev), zScore: Number(zScore.toFixed(2)) },
    };
  }
  if (zScore >= 2) {
    return {
      ...base,
      outcome: "warn",
      severity: "medium",
      riskPoints: 40,
      explanation: `${money(amount)} is higher than this employee's usual ${claim.category} spend of about ${money(Math.round(mean))}.`,
      evidence: { mean: Math.round(mean), zScore: Number(zScore.toFixed(2)) },
    };
  }

  return {
    ...base,
    outcome: "pass",
    severity: "info",
    riskPoints: 0,
    explanation: `Amount is consistent with this employee's ${claim.category} history (average ${money(Math.round(mean))}).`,
    evidence: { mean: Math.round(mean) },
  };
}

const MCC_CATEGORY_MAP: Record<string, string> = {
  "5541": "fuel",
  "5542": "fuel",
  "5812": "food",
  "5813": "food",
  "5814": "food",
  "4121": "travel",
  "4111": "travel",
  "4722": "travel",
  "7011": "lodging",
  "5411": "groceries",
  "5943": "office",
};

/** The merchant category code on the payment disagrees with the category claimed. */
export function checkCategoryConsistency(claim: ClaimContext): VerificationCheck {
  const base = { id: "category_mismatch", label: "Category and MCC", weight: 1.5 };
  const expected = MCC_CATEGORY_MAP[claim.mcc];

  if (!expected) {
    return {
      ...base,
      outcome: "skipped",
      severity: "info",
      riskPoints: 0,
      explanation: `MCC ${claim.mcc || "unknown"} is not in the category map, so no comparison was made.`,
    };
  }

  const claimed = normalizeCategory(claim.category);
  if (claimed === expected) {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: `Merchant category code ${claim.mcc} agrees with the claimed category.`,
    };
  }

  return {
    ...base,
    outcome: "fail",
    severity: "medium",
    riskPoints: 60,
    explanation: `The payment's merchant category code ${claim.mcc} indicates ${expected}, but the claim is filed under ${claim.category}. Miscategorised spend can bypass category budgets.`,
    evidence: { mcc: claim.mcc, expected, claimed: claim.category },
  };
}

/**
 * Image forensics is deliberately a supporting signal. It carries real weight only
 * when the payment-record checks cannot confirm the claim on their own.
 */
export function checkReceiptForensics(claim: ClaimContext): VerificationCheck {
  const base = { id: "receipt_forensics", label: "Receipt image forensics", weight: 1.5 };

  if (!claim.receiptUrl) {
    return {
      ...base,
      outcome: "warn",
      severity: "medium",
      riskPoints: 50,
      explanation: "No receipt image was attached to this claim.",
    };
  }
  if (claim.receiptFraudScore == null) {
    return {
      ...base,
      outcome: "skipped",
      severity: "info",
      riskPoints: 0,
      explanation: "The receipt image has not been scanned yet.",
    };
  }

  const score = claim.receiptFraudScore;
  if (score >= 71) {
    return {
      ...base,
      outcome: "fail",
      severity: "high",
      riskPoints: score,
      explanation: `Image forensics scored this receipt ${score}/100, indicating likely editing or synthetic generation. Treat as supporting evidence, not proof.`,
      evidence: { score, tier: claim.receiptFraudTier },
    };
  }
  if (score >= 31) {
    return {
      ...base,
      outcome: "warn",
      severity: "medium",
      riskPoints: score,
      explanation: `Image forensics scored this receipt ${score}/100. Some indicators are inconclusive and warrant a look.`,
      evidence: { score, tier: claim.receiptFraudTier },
    };
  }

  return {
    ...base,
    outcome: "pass",
    severity: "info",
    riskPoints: score,
    explanation: `Image forensics scored this receipt ${score}/100, within the normal range for camera photos of printed bills.`,
    evidence: { score, tier: claim.receiptFraudTier },
  };
}

/** Company expense policy breaches, surfaced alongside the fraud signals. */
export function checkPolicyCompliance(
  claim: ClaimContext,
  violations: Array<{ policyName: string; reasons: string[] }>
): VerificationCheck {
  const base = { id: "policy_violation", label: "Expense policy", weight: 2 };

  if (violations.length === 0) {
    return {
      ...base,
      outcome: "pass",
      severity: "info",
      riskPoints: 0,
      explanation: "The claim satisfies every active expense policy in scope.",
    };
  }

  const lines = violations.flatMap((v) => v.reasons.map((reason) => `${v.policyName}: ${reason}`));
  return {
    ...base,
    outcome: "fail",
    severity: "medium",
    riskPoints: 65,
    explanation: `Breaks ${violations.length} expense polic${violations.length === 1 ? "y" : "ies"}. ${lines.join(" ")}`,
    evidence: { violations: lines },
  };
}
