import dayjs from "dayjs";
import {
  checkAllpayMatch,
  checkAmountAnomaly,
  checkAttendanceConflict,
  checkCategoryConsistency,
  checkDuplicateClaim,
  checkPolicyCompliance,
  checkReceiptForensics,
  checkTiming,
  merchantsLikelySame,
  type AllpayPayment,
  type AttendanceDay,
  type ClaimContext,
  type PriorClaim,
} from "../services/verification/checks";
import { runChecks, scoreChecks } from "../services/verification/verificationService";
import type { VerificationCheck } from "../services/verification/types";

const baseClaim: ClaimContext = {
  id: "TX-CHECK-1",
  employeeId: "emp7",
  employeeName: "Test Employee",
  department: "Data Engineering",
  merchantName: "Indian Oil",
  category: "Fuel",
  mcc: "5541",
  amount: 2150,
  claimedAmount: 2150,
  dateTime: dayjs().subtract(2, "day").hour(11).minute(0).second(0).toISOString(),
  upiRefId: "UPI-CHECK-1",
};

const payment = (over: Partial<AllpayPayment> = {}): AllpayPayment => ({
  id: "PAY-1",
  employeeId: "emp7",
  amountPaise: 215000,
  payeeName: "Indian Oil",
  status: "SUCCESS_REPORTED",
  initiatedAt: baseClaim.dateTime,
  completedAt: baseClaim.dateTime,
  ...over,
});

const prior = (over: Partial<PriorClaim> = {}): PriorClaim => ({
  id: "TX-PRIOR",
  employeeId: "emp7",
  merchantName: "Indian Oil",
  category: "Fuel",
  amount: 2000,
  dateTime: dayjs().subtract(20, "day").toISOString(),
  status: "approved",
  ...over,
});

describe("AllPay payment match", () => {
  it("passes when a settled payment matches the claimed amount", () => {
    const result = checkAllpayMatch(baseClaim, [payment()]);
    expect(result.outcome).toBe("pass");
    expect(result.riskPoints).toBe(0);
    expect(result.explanation).toContain("PAY-1");
  });

  it("tolerates rounding within one percent", () => {
    const result = checkAllpayMatch(baseClaim, [payment({ amountPaise: 214000 })]);
    expect(result.outcome).toBe("pass");
  });

  it("flags a claim inflated above the real payment as critical", () => {
    const claim = { ...baseClaim, amount: 4300, claimedAmount: 4300 };
    const result = checkAllpayMatch(claim, [payment()]);
    expect(result.outcome).toBe("fail");
    expect(result.severity).toBe("critical");
    expect(result.explanation).toContain("higher than the amount actually paid");
    expect(result.evidence?.["difference"]).toBe(2150);
  });

  it("ignores payments that never settled", () => {
    const result = checkAllpayMatch(baseClaim, [payment({ status: "FAILED" })]);
    expect(result.outcome).toBe("warn");
    expect(result.explanation).toContain("No AllPay payment was found");
  });

  it("ignores payments outside the 72 hour window", () => {
    const stale = payment({
      initiatedAt: dayjs(baseClaim.dateTime).subtract(10, "day").toISOString(),
      completedAt: dayjs(baseClaim.dateTime).subtract(10, "day").toISOString(),
    });
    const result = checkAllpayMatch(baseClaim, [stale]);
    expect(result.outcome).toBe("warn");
  });
});

describe("duplicate claim", () => {
  it("blocks a reused UPI reference", () => {
    const result = checkDuplicateClaim(baseClaim, [
      prior({ id: "TX-OLD", upiRefId: "UPI-CHECK-1" }),
    ]);
    expect(result.outcome).toBe("fail");
    expect(result.severity).toBe("critical");
    expect(result.riskPoints).toBe(100);
  });

  it("catches the same merchant and amount within a week", () => {
    const result = checkDuplicateClaim(baseClaim, [
      prior({ id: "TX-NEAR", amount: 2150, dateTime: dayjs(baseClaim.dateTime).subtract(2, "day").toISOString() }),
    ]);
    expect(result.outcome).toBe("fail");
    expect(result.evidence?.["duplicateOf"]).toBe("TX-NEAR");
  });

  it("ignores rejected claims as duplicates", () => {
    const result = checkDuplicateClaim(baseClaim, [
      prior({ id: "TX-REJ", amount: 2150, status: "rejected", dateTime: baseClaim.dateTime }),
    ]);
    expect(result.outcome).toBe("pass");
  });

  it("does not flag the claim against itself", () => {
    const result = checkDuplicateClaim(baseClaim, [
      prior({ id: baseClaim.id, amount: 2150, dateTime: baseClaim.dateTime }),
    ]);
    expect(result.outcome).toBe("pass");
  });
});

describe("attendance conflict", () => {
  const officeDay = (over: Partial<AttendanceDay> = {}): AttendanceDay => ({
    employeeId: "emp7",
    date: dayjs(baseClaim.dateTime).format("YYYY-MM-DD"),
    punchIn: dayjs(baseClaim.dateTime).hour(9).minute(30).toISOString(),
    punchOut: dayjs(baseClaim.dateTime).hour(18).minute(30).toISOString(),
    workLocation: "office",
    ...over,
  });

  it("flags a metro ticket bought while punched in at the office", () => {
    const metroClaim: ClaimContext = {
      ...baseClaim,
      merchantName: "Delhi Metro",
      category: "Travel",
      mcc: "4111",
      amount: 45,
      claimedAmount: 45,
      dateTime: dayjs(baseClaim.dateTime).hour(15).minute(30).toISOString(),
    };
    const result = checkAttendanceConflict(metroClaim, officeDay());
    expect(result.outcome).toBe("fail");
    expect(result.severity).toBe("high");
    expect(result.explanation).toContain("punched in at the office");
  });

  it("accepts travel spend when the employee was logged as travelling", () => {
    const metroClaim = { ...baseClaim, merchantName: "Delhi Metro", category: "Travel" };
    const result = checkAttendanceConflict(metroClaim, officeDay({ workLocation: "travel" }));
    expect(result.outcome).toBe("pass");
  });

  it("accepts spend outside office hours", () => {
    const metroClaim: ClaimContext = {
      ...baseClaim,
      merchantName: "Delhi Metro",
      category: "Travel",
      dateTime: dayjs(baseClaim.dateTime).hour(20).minute(15).toISOString(),
    };
    const result = checkAttendanceConflict(metroClaim, officeDay());
    expect(result.outcome).toBe("pass");
  });

  it("does not apply to non-movement categories", () => {
    const mealClaim = { ...baseClaim, merchantName: "Cafeteria", category: "Food", mcc: "5812" };
    const result = checkAttendanceConflict(mealClaim, officeDay());
    expect(result.outcome).toBe("pass");
  });

  it("treats fuel during office hours as worth a look, not a contradiction", () => {
    const fuelClaim: ClaimContext = {
      ...baseClaim,
      dateTime: dayjs(baseClaim.dateTime).hour(14).minute(0).toISOString(),
    };
    const result = checkAttendanceConflict(fuelClaim, officeDay());
    expect(result.outcome).toBe("warn");
    expect(result.severity).toBe("low");
  });

  it("skips when no attendance record exists", () => {
    const result = checkAttendanceConflict(baseClaim, null);
    expect(result.outcome).toBe("skipped");
    expect(result.riskPoints).toBe(0);
  });
});

describe("category and MCC consistency", () => {
  it("passes when the code agrees with the category", () => {
    expect(checkCategoryConsistency(baseClaim).outcome).toBe("pass");
  });

  it("fails when fuel spend is filed as food", () => {
    const result = checkCategoryConsistency({ ...baseClaim, category: "Food" });
    expect(result.outcome).toBe("fail");
    expect(result.explanation).toContain("fuel");
  });

  it("skips unmapped codes", () => {
    expect(checkCategoryConsistency({ ...baseClaim, mcc: "9999" }).outcome).toBe("skipped");
  });
});

describe("amount anomaly", () => {
  const history = (amounts: number[]) =>
    amounts.map((amount, index) => prior({ id: `TX-H${index}`, amount }));

  it("needs at least three approved claims before judging", () => {
    const result = checkAmountAnomaly(baseClaim, history([2000, 2100]));
    expect(result.outcome).toBe("skipped");
  });

  it("passes an amount close to the employee average", () => {
    const result = checkAmountAnomaly(baseClaim, history([2000, 2100, 2200, 2300]));
    expect(result.outcome).toBe("pass");
  });

  it("fails an amount far above the employee average", () => {
    const claim = { ...baseClaim, amount: 25000, claimedAmount: 25000 };
    const result = checkAmountAnomaly(claim, history([2000, 2100, 2200, 2300]));
    expect(result.outcome).toBe("fail");
    expect(result.severity).toBe("high");
  });
});

describe("receipt forensics weighting", () => {
  it("warns when no receipt image is attached", () => {
    const result = checkReceiptForensics(baseClaim);
    expect(result.outcome).toBe("warn");
  });

  it("passes a low forensic score", () => {
    const result = checkReceiptForensics({
      ...baseClaim,
      receiptUrl: "/api/receipts/abc",
      receiptFraudScore: 12,
      receiptFraudTier: "safe",
    });
    expect(result.outcome).toBe("pass");
  });

  it("fails a high forensic score but frames it as supporting evidence", () => {
    const result = checkReceiptForensics({
      ...baseClaim,
      receiptUrl: "/api/receipts/abc",
      receiptFraudScore: 88,
      receiptFraudTier: "high_risk",
    });
    expect(result.outcome).toBe("fail");
    expect(result.explanation).toContain("supporting evidence");
  });
});

describe("policy compliance", () => {
  it("passes with no violations", () => {
    expect(checkPolicyCompliance(baseClaim, []).outcome).toBe("pass");
  });

  it("reports each violation reason", () => {
    const result = checkPolicyCompliance(baseClaim, [
      { policyName: "Fuel cap", reasons: ["Amount Rs.2150 exceeds per-transaction cap of Rs.1500"] },
    ]);
    expect(result.outcome).toBe("fail");
    expect(result.explanation).toContain("Fuel cap");
  });
});

describe("merchant matching", () => {
  it("matches the same payee written differently", () => {
    expect(merchantsLikelySame("Indian Oil Pvt Ltd", "Indian Oil")).toBe(true);
    expect(merchantsLikelySame("SWIGGY", "Swiggy")).toBe(true);
    expect(merchantsLikelySame("Taj Hotels India", "Taj Hotels")).toBe(true);
  });

  it("does not match different payees that share one common word", () => {
    expect(merchantsLikelySame("Indian Oil", "Indian Railways")).toBe(false);
    expect(merchantsLikelySame("Blue Dart", "Blue Star")).toBe(false);
  });

  it("never matches on an empty name", () => {
    expect(merchantsLikelySame("", "Indian Oil")).toBe(false);
    expect(merchantsLikelySame("Indian Oil", "")).toBe(false);
    expect(merchantsLikelySame("", "")).toBe(false);
  });
});

describe("edge cases", () => {
  it("does not treat an unnamed merchant as matching every payment", () => {
    const claim = { ...baseClaim, merchantName: "", amount: 9999, claimedAmount: 9999 };
    const result = checkAllpayMatch(claim, [payment()]);
    expect(result.outcome).not.toBe("fail");
  });

  it("does not raise a mismatch for a different payee at a similar time", () => {
    const claim = { ...baseClaim, merchantName: "Indian Railways", amount: 900, claimedAmount: 900 };
    const result = checkAllpayMatch(claim, [payment({ payeeName: "Indian Oil" })]);
    expect(result.outcome).toBe("warn");
    expect(result.severity).toBe("medium");
  });

  it("falls back to amount when claimedAmount is zero", () => {
    const claim = { ...baseClaim, claimedAmount: 0 };
    const result = checkAllpayMatch(claim, [payment()]);
    expect(result.outcome).toBe("pass");
  });

  it("rejects a future-dated claim outright", () => {
    const claim = { ...baseClaim, dateTime: dayjs().add(3, "day").toISOString() };
    const result = checkTiming(claim);
    expect(result.outcome).toBe("fail");
    expect(result.severity).toBe("critical");
  });

  it("warns on a claim older than the reimbursement window", () => {
    const claim = { ...baseClaim, dateTime: dayjs().subtract(200, "day").toISOString() };
    const result = checkTiming(claim);
    expect(result.outcome).toBe("warn");
    expect(result.evidence?.["ageDays"]).toBeGreaterThan(90);
  });

  it("accepts a normal working-hours claim", () => {
    expect(checkTiming(baseClaim).outcome).toBe("pass");
  });

  it("handles an employee with no history at all", () => {
    const result = checkAmountAnomaly(baseClaim, []);
    expect(result.outcome).toBe("skipped");
    expect(result.riskPoints).toBe(0);
  });
});

describe("scoring", () => {
  const check = (over: Partial<VerificationCheck>): VerificationCheck => ({
    id: "test",
    label: "Test",
    outcome: "pass",
    severity: "info",
    riskPoints: 0,
    weight: 1,
    explanation: "ok",
    ...over,
  });

  it("returns verified when AllPay matches and nothing fails", () => {
    const result = scoreChecks([
      check({ id: "allpay_match", outcome: "pass", riskPoints: 0, weight: 3 }),
      check({ id: "duplicate_claim", outcome: "pass" }),
    ]);
    expect(result.verdict).toBe("verified");
    expect(result.evidenceStrength).toBe("transaction_matched");
    expect(result.riskScore).toBeLessThanOrEqual(20);
  });

  it("lets a single critical failure drive the verdict", () => {
    const result = scoreChecks([
      check({ id: "allpay_match", outcome: "pass", riskPoints: 0, weight: 3 }),
      check({ id: "duplicate_claim", outcome: "fail", severity: "critical", riskPoints: 100, weight: 2 }),
    ]);
    expect(result.verdict).toBe("high_risk");
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
  });

  it("keeps a matched payment from being buried by soft warnings", () => {
    const result = scoreChecks([
      check({ id: "allpay_match", outcome: "pass", riskPoints: 0, weight: 3 }),
      check({ id: "timing_anomaly", outcome: "warn", severity: "low", riskPoints: 30, weight: 1 }),
      check({ id: "receipt_forensics", outcome: "warn", severity: "medium", riskPoints: 55, weight: 1.5 }),
    ]);
    expect(result.riskScore).toBeLessThanOrEqual(20);
    expect(result.verdict).toBe("verified");
  });

  it("ignores skipped checks in the weighted average", () => {
    const withSkip = scoreChecks([
      check({ id: "allpay_match", outcome: "warn", severity: "medium", riskPoints: 40, weight: 3 }),
      check({ id: "attendance_conflict", outcome: "skipped", riskPoints: 0, weight: 2.5 }),
    ]);
    const withoutSkip = scoreChecks([
      check({ id: "allpay_match", outcome: "warn", severity: "medium", riskPoints: 40, weight: 3 }),
    ]);
    expect(withSkip.riskScore).toBe(withoutSkip.riskScore);
  });

  it("does not let passing checks dilute a real signal", () => {
    const result = scoreChecks([
      check({ id: "allpay_match", outcome: "warn", severity: "medium", riskPoints: 45, weight: 3 }),
      check({ id: "receipt_forensics", outcome: "warn", severity: "medium", riskPoints: 64, weight: 1.5 }),
      check({ id: "duplicate_claim", outcome: "pass", riskPoints: 0, weight: 2 }),
      check({ id: "policy_violation", outcome: "pass", riskPoints: 0, weight: 2 }),
      check({ id: "category_mismatch", outcome: "pass", riskPoints: 0, weight: 1.5 }),
    ]);
    expect(result.riskScore).toBeGreaterThanOrEqual(45);
    expect(result.verdict).toBe("needs_review");
  });

  it("scores zero when nothing raises a signal", () => {
    const result = scoreChecks([
      check({ id: "duplicate_claim", outcome: "pass" }),
      check({ id: "policy_violation", outcome: "pass" }),
    ]);
    expect(result.riskScore).toBe(0);
    expect(result.verdict).toBe("low_risk");
  });

  it("never returns a score outside 0-100", () => {
    const result = scoreChecks([
      check({ outcome: "fail", severity: "critical", riskPoints: 1000, weight: 5 }),
    ]);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  it("headlines the most severe failure", () => {
    const result = scoreChecks([
      check({ id: "timing_anomaly", outcome: "fail", severity: "low", riskPoints: 30, explanation: "Minor timing issue" }),
      check({ id: "duplicate_claim", outcome: "fail", severity: "critical", riskPoints: 100, explanation: "Already reimbursed" }),
    ]);
    expect(result.headline).toBe("Already reimbursed");
  });
});

describe("end to end rule run", () => {
  const inputs = {
    claim: baseClaim,
    payments: [payment()],
    priorClaims: [prior(), prior({ id: "TX-P2", amount: 2100 }), prior({ id: "TX-P3", amount: 2200 })],
    attendance: null,
    policies: [],
    monthlySpend: new Map<string, number>(),
  };

  it("verifies a clean, payment-matched claim", () => {
    const result = runChecks(inputs);
    expect(result.verdict).toBe("verified");
    expect(result.failedCheckIds).toHaveLength(0);
  });

  it("produces a check result for every rule", () => {
    const result = runChecks(inputs);
    expect(result.checks.map((c) => c.id).sort()).toEqual(
      [
        "allpay_match",
        "amount_anomaly",
        "attendance_conflict",
        "category_mismatch",
        "duplicate_claim",
        "policy_violation",
        "receipt_forensics",
      ].sort()
    );
  });

  it("escalates an inflated claim to high risk", () => {
    const result = runChecks({
      ...inputs,
      claim: { ...baseClaim, amount: 9000, claimedAmount: 9000 },
    });
    expect(result.verdict).toBe("high_risk");
    expect(result.failedCheckIds).toContain("allpay_match");
  });

  it("writes an explanation for every check", () => {
    const result = runChecks(inputs);
    for (const check of result.checks) {
      expect(check.explanation.length).toBeGreaterThan(10);
    }
  });
});
