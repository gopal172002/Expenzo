import dayjs from "dayjs";
import { Attendance, Transaction } from "./models";
import { DEMO_EMPLOYEE_ID } from "./demoEmployeeData";
import { DEMO_COMPANY_ID } from "./tenant";

/**
 * Demo data for the verification engine: some claims are backed by a real AllPay
 * merchant payout, one is inflated above what was actually paid, and one travel
 * claim lands inside an office shift.
 */
const MATCHED_CLAIMS = ["TX-DEMO-1004", "TX-DEMO-1005", "TX-DEMO-1015", "TX-DEMO-1016"];
const INFLATED_CLAIM = "TX-DEMO-1013";
const OFFICE_SHIFT_CLAIMS = ["TX-DEMO-1010", "TX-DEMO-1011"];

async function upsertSettledPayment(input: {
  id: string;
  employeeId: string;
  companyId?: string;
  merchantName: string;
  category: string;
  mcc: string;
  amount: number;
  dateTime: string;
}): Promise<void> {
  const amountPaise = Math.round(input.amount * 100);
  await Transaction.updateOne(
    { id: input.id },
    {
      $set: {
        id: input.id,
        employeeId: input.employeeId,
        ...(input.companyId ? { companyId: input.companyId } : {}),
        employeeName: "Demo Employee",
        department: "Operations",
        merchantName: input.merchantName,
        merchantVpa: `${input.merchantName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
        mcc: input.mcc,
        category: input.category,
        amount: input.amount,
        claimedAmount: input.amount,
        dateTime: input.dateTime,
        status: "pending",
        upiApp: "Razorpay",
        upiRefId: `UTR-${input.id}`,
        isNewTx: true,
        flags: [],
        hasMatchingAllpayRecord: true,
        purposeCategory: input.category,
        timeline: [],
        paymentStatus: "payout_processed",
        paymentMethod: "razorpay_merchant_payout",
        expenseSource: "ALLPAY_MERCHANT_PAYOUT",
        orderAmountPaise: amountPaise,
        capturedAmountPaise: amountPaise,
        payoutUtr: `UTR-${input.id}`,
        payoutProcessedAt: input.dateTime,
        paymentConfirmedAt: input.dateTime,
      },
    },
    { upsert: true }
  );
}

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

    const paidAmount = claim.id === INFLATED_CLAIM ? Math.round(claim.amount * 0.4) : claim.amount;
    if (claim.id === INFLATED_CLAIM) {
      await upsertSettledPayment({
        id: `PAY-DEMO-${claim.id}`,
        employeeId: claim.employeeId,
        companyId: claim.companyId || undefined,
        merchantName: claim.merchantName,
        category: claim.category,
        mcc: claim.mcc,
        amount: paidAmount,
        dateTime: claim.dateTime,
      });
    } else {
      await Transaction.updateOne(
        { id: claim.id },
        {
          $set: {
            paymentStatus: "payout_processed",
            hasMatchingAllpayRecord: true,
            paymentMethod: "razorpay_merchant_payout",
            expenseSource: "ALLPAY_MERCHANT_PAYOUT",
            orderAmountPaise: Math.round(claim.amount * 100),
            capturedAmountPaise: Math.round(claim.amount * 100),
            payoutProcessedAt: claim.dateTime,
            paymentConfirmedAt: claim.dateTime,
          },
        }
      );
    }
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
