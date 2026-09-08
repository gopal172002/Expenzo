import dayjs from "dayjs";
import {
  Attendance,
  ExpensePolicy as ExpensePolicyModel,
  Transaction,
  UpiIntentPayment,
} from "../../models";
import {
  buildMonthlySpendMap,
  evaluateTransactionAgainstPolicies,
} from "../policyEvaluationService";
import type { ExpensePolicy } from "../analyticsTypes";
import {
  checkAllpayMatch,
  checkAmountAnomaly,
  checkAttendanceConflict,
  checkCategoryConsistency,
  checkDuplicateClaim,
  checkPolicyCompliance,
  checkReceiptForensics,
  type AllpayPayment,
  type AttendanceDay,
  type ClaimContext,
  type PriorClaim,
} from "./checks";
import {
  SEVERITY_ORDER,
  VERDICT_LABELS,
  verdictFromScore,
  type VerificationCheck,
  type VerificationResult,
} from "./types";

export type VerificationInputs = {
  claim: ClaimContext;
  payments: AllpayPayment[];
  priorClaims: PriorClaim[];
  attendance: AttendanceDay | null;
  policies: ExpensePolicy[];
  monthlySpend: Map<string, number>;
};

/**
 * Weighted risk over signals only. Checks that pass are not averaged in, because a
 * clean policy check is not evidence that a claim is genuine; it just is not evidence
 * against it. Averaging passes would let a claim with no payment match and a doubtful
 * receipt score as low risk. The one exception is a matched AllPay payment, which is
 * positive evidence and therefore caps the score.
 */
export function scoreChecks(checks: VerificationCheck[]): VerificationResult {
  const evaluated = checks.filter((check) => check.outcome !== "skipped");
  const signals = evaluated.filter(
    (check) => check.outcome === "fail" || check.outcome === "warn"
  );
  const signalWeight = signals.reduce((sum, check) => sum + check.weight, 0);
  const weighted =
    signalWeight === 0
      ? 0
      : signals.reduce((sum, check) => sum + check.riskPoints * check.weight, 0) / signalWeight;

  const worst = evaluated.reduce(
    (max, check) =>
      check.outcome === "fail" && SEVERITY_ORDER[check.severity] > SEVERITY_ORDER[max]
        ? check.severity
        : max,
    "info" as VerificationCheck["severity"]
  );

  // A critical failure (duplicate payment, amount inflated past the real payment,
  // future-dated receipt) is decisive regardless of how clean everything else looks.
  const floor = worst === "critical" ? 90 : worst === "high" ? 70 : 0;

  const matchCheck = evaluated.find((check) => check.id === "allpay_match");
  const matched = matchCheck?.outcome === "pass";

  let riskScore = Math.max(weighted, floor);
  if (matched && worst !== "critical" && worst !== "high") {
    // Payment rails corroborate the amount, so heuristic noise should not dominate.
    riskScore = Math.min(riskScore, 20);
  }
  riskScore = Math.round(Math.max(0, Math.min(100, riskScore)));

  const verdict = verdictFromScore(riskScore, matched);
  const failed = evaluated.filter((check) => check.outcome === "fail");
  const warned = evaluated.filter((check) => check.outcome === "warn");

  const evidenceStrength = matched
    ? "transaction_matched"
    : evaluated.some((check) => check.id === "attendance_conflict")
      ? "partial_evidence"
      : "heuristic_only";

  const headline = failed.length
    ? failed
        .slice()
        .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])[0]!.explanation
    : matched
      ? matchCheck!.explanation
      : warned.length
        ? warned[0]!.explanation
        : "No issues found across payment, policy, timing, and image checks.";

  return {
    riskScore,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    evidenceStrength,
    headline,
    checks,
    failedCheckIds: failed.map((check) => check.id),
    evaluatedAt: dayjs().toISOString(),
  };
}

export function runChecks(inputs: VerificationInputs): VerificationResult {
  const { claim, payments, priorClaims, attendance, policies, monthlySpend } = inputs;
  const violations = evaluateTransactionAgainstPolicies(
    {
      id: claim.id,
      amount: claim.claimedAmount || claim.amount,
      dateTime: claim.dateTime,
      category: claim.category,
      employeeId: claim.employeeId,
      department: claim.department,
    },
    policies,
    monthlySpend
  );

  return scoreChecks([
    checkAllpayMatch(claim, payments),
    checkDuplicateClaim(claim, priorClaims),
    checkAttendanceConflict(claim, attendance),
    checkPolicyCompliance(claim, violations),
    checkCategoryConsistency(claim),
    checkAmountAnomaly(claim, priorClaims),
    checkReceiptForensics(claim),
  ]);
}

/** Load everything a claim is judged against, then score it. Always company-scoped. */
export async function verifyClaim(claim: ClaimContext): Promise<VerificationResult> {
  const companyId = String(claim.companyId || "").trim();
  if (!companyId) {
    throw new Error("verifyClaim requires claim.companyId for multi-company isolation");
  }

  const claimDate = dayjs(claim.dateTime);
  const tenant = { companyId, employeeId: claim.employeeId };

  const [paymentDocs, priorDocs, attendanceDoc, policyDocs] = await Promise.all([
    UpiIntentPayment.find({
      ...tenant,
      initiatedAt: {
        $gte: claimDate.subtract(7, "day").toISOString(),
        $lte: claimDate.add(7, "day").toISOString(),
      },
    })
      .limit(100)
      .lean(),
    Transaction.find(tenant)
      .select({
        id: 1,
        employeeId: 1,
        merchantName: 1,
        category: 1,
        amount: 1,
        dateTime: 1,
        upiRefId: 1,
        status: 1,
      })
      .sort({ dateTime: -1 })
      .limit(300)
      .lean(),
    Attendance.findOne({
      ...tenant,
      date: claimDate.format("YYYY-MM-DD"),
    }).lean(),
    ExpensePolicyModel.find({ companyId, active: true }).lean(),
  ]);

  const priorClaims: PriorClaim[] = priorDocs.map((doc) => ({
    id: doc.id,
    employeeId: doc.employeeId,
    merchantName: doc.merchantName,
    category: doc.category,
    amount: doc.amount,
    dateTime: doc.dateTime,
    status: doc.status,
    ...(doc.upiRefId ? { upiRefId: doc.upiRefId } : {}),
  }));

  const payments: AllpayPayment[] = paymentDocs.map((doc) => ({
    id: doc.id,
    employeeId: doc.employeeId,
    amountPaise: doc.amountPaise,
    payeeName: doc.payeeName,
    status: doc.status,
    initiatedAt: doc.initiatedAt,
    ...(doc.category ? { category: doc.category } : {}),
    ...(doc.mcc ? { mcc: doc.mcc } : {}),
    ...(doc.completedAt ? { completedAt: doc.completedAt } : {}),
  }));

  const attendance: AttendanceDay | null = attendanceDoc
    ? {
        employeeId: attendanceDoc.employeeId,
        date: attendanceDoc.date,
        workLocation: attendanceDoc.workLocation,
        ...(attendanceDoc.punchIn ? { punchIn: attendanceDoc.punchIn } : {}),
        ...(attendanceDoc.punchOut ? { punchOut: attendanceDoc.punchOut } : {}),
      }
    : null;

  const policies = policyDocs as unknown as ExpensePolicy[];
  const monthlySpend = buildMonthlySpendMap(priorClaims, claim.id);

  return runChecks({ claim, payments, priorClaims, attendance, policies, monthlySpend });
}

export function claimContextFromTransaction(tx: {
  id: string;
  employeeId: string;
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
}): ClaimContext {
  return {
    id: tx.id,
    employeeId: tx.employeeId,
    ...(tx.companyId ? { companyId: tx.companyId } : {}),
    employeeName: tx.employeeName,
    department: tx.department,
    merchantName: tx.merchantName,
    category: tx.category,
    mcc: tx.mcc,
    amount: tx.amount,
    claimedAmount: tx.claimedAmount,
    dateTime: tx.dateTime,
    ...(tx.upiRefId ? { upiRefId: tx.upiRefId } : {}),
    ...(tx.receiptFraudScore != null ? { receiptFraudScore: tx.receiptFraudScore } : {}),
    ...(tx.receiptFraudTier ? { receiptFraudTier: tx.receiptFraudTier } : {}),
    ...(tx.receiptUrl ? { receiptUrl: tx.receiptUrl } : {}),
  };
}
