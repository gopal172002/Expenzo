import dayjs from "dayjs";
import { Attendance, Transaction, UpiIntentPayment } from "./models";
import { DEMO_EMPLOYEE_ID } from "./demoEmployeeData";
import { DEMO_COMPANY_ID } from "./tenant";

/**
 * Demo data for the verification engine: some claims are backed by a real AllPay
 * payment, one is inflated above what was actually paid, and one travel claim lands
 * inside an office shift. Without this the dashboard cannot show what it can catch.
 */
const MATCHED_CLAIMS = ["TX-DEMO-1004", "TX-DEMO-1005", "TX-DEMO-1015", "TX-DEMO-1016"];
const INFLATED_CLAIM = "TX-DEMO-1013";
const OFFICE_SHIFT_CLAIMS = ["TX-DEMO-1010", "TX-DEMO-1011"];

export async function seedVerificationDemoData(): Promise<{
  payments: number;
  attendance: number;
}> {
  const ids = [...MATCHED_CLAIMS, INFLATED_CLAIM, ...OFFICE_SHIFT_CLAIMS];
  const claims = await Transaction.find({ id: { $in: ids } }).lean();
  if (claims.length === 0) return { payments: 0, attendance: 0 };

  let payments = 0;
  for (const claim of claims) {
    if (OFFICE_SHIFT_CLAIMS.includes(claim.id)) continue;

    // The inflated claim pays only part of what the employee later claimed.
    const paidAmount = claim.id === INFLATED_CLAIM ? Math.round(claim.amount * 0.4) : claim.amount;
    const paymentId = `PAY-DEMO-${claim.id}`;
    await UpiIntentPayment.updateOne(
      { id: paymentId },
      {
        $set: {
          id: paymentId,
          employeeId: claim.employeeId,
          companyId: claim.companyId || undefined,
          amountPaise: Math.round(paidAmount * 100),
          currency: "INR",
          payeeName: claim.merchantName,
          payeeVpa: `${claim.merchantName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
          category: claim.category,
          mcc: claim.mcc,
          paymentMethod: "UPI_INTENT",
          status: "SUCCESS_REPORTED",
          launchTxnRef: `REF-${claim.id}`,
          initiatedAt: claim.dateTime,
          completedAt: claim.dateTime,
        },
      },
      { upsert: true }
    );
    payments += 1;
  }

  let attendance = 0;
  for (const claim of claims.filter((c) => OFFICE_SHIFT_CLAIMS.includes(c.id))) {
    const date = dayjs(claim.dateTime).format("YYYY-MM-DD");
    const companyId = claim.companyId || undefined;
    await Attendance.updateOne(
      { employeeId: claim.employeeId, date, ...(companyId ? { companyId } : {}) },
      {
        $set: {
          id: `ATT-${companyId || "na"}-${claim.employeeId}-${date}`,
          employeeId: claim.employeeId,
          ...(companyId ? { companyId } : {}),
          date,
          punchIn: dayjs(claim.dateTime).hour(9).minute(30).second(0).toISOString(),
          punchOut: dayjs(claim.dateTime).hour(18).minute(30).second(0).toISOString(),
          workLocation: "office",
          source: "hrms",
        },
      },
      { upsert: true }
    );
    attendance += 1;
  }

  // A normal office day for the demo employee so the attendance sheet is not empty.
  // Only days without another demo claim are seeded, so the sheet does not
  // accidentally contradict claims that are meant to verify cleanly.
  const claimDates = new Set(
    (await Transaction.find({ employeeId: DEMO_EMPLOYEE_ID, companyId: DEMO_COMPANY_ID })
      .select({ dateTime: 1 })
      .lean()).map((doc) => dayjs(doc.dateTime).format("YYYY-MM-DD"))
  );
  for (let daysAgo = 1; daysAgo <= 14; daysAgo += 1) {
    const day = dayjs().subtract(daysAgo, "day");
    if (day.day() === 0 || day.day() === 6) continue;
    const date = day.format("YYYY-MM-DD");
    if (claimDates.has(date)) continue;
    const existing = await Attendance.findOne({
      employeeId: DEMO_EMPLOYEE_ID,
      companyId: DEMO_COMPANY_ID,
      date,
    })
      .select({ id: 1 })
      .lean();
    if (existing) continue;
    await Attendance.create({
      id: `ATT-${DEMO_COMPANY_ID}-${DEMO_EMPLOYEE_ID}-${date}`,
      employeeId: DEMO_EMPLOYEE_ID,
      companyId: DEMO_COMPANY_ID,
      date,
      punchIn: day.hour(9).minute(35).second(0).toISOString(),
      punchOut: day.hour(18).minute(20).second(0).toISOString(),
      workLocation: "office",
      source: "hrms",
    });
    attendance += 1;
  }

  return { payments, attendance };
}
