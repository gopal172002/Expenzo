import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import {
  Employee,
  Transaction,
  UpiIntentPayment,
  type IUpiIntentPayment,
  type UpiIntentStatus,
} from "../models";
import {
  applyLocationToRecord,
  type PaymentLocationSnapshot,
} from "./paymentLocation";
import {
  applyUpiStatusTransition,
  isUpiIntentStatus,
  shouldCreateExpense,
} from "./upiIntentState";

const MIN_AMOUNT_PAISE = 100;
const MAX_AMOUNT_PAISE = 10_000_000;
const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export type CreateUpiIntentInput = {
  paymentId?: string;
  employeeId: string;
  companyId?: string;
  amountPaise: number;
  currency?: string;
  payeeVpa: string;
  payeeName?: string;
  note?: string;
  category?: string;
  mcc?: string;
  launchTxnRef?: string;
  location?: PaymentLocationSnapshot | null;
};

export type UpiIntentResultInput = {
  paymentId: string;
  employeeId?: string;
  status: string;
  upiTxnId?: string;
  upiTxnRef?: string;
  approvalRefNo?: string;
  responseCode?: string;
  location?: PaymentLocationSnapshot | null;
};

function paiseToDashboardAmount(amountPaise: number): number {
  const rupees = Math.trunc(amountPaise / 100);
  const paise = Math.abs(amountPaise % 100);
  return Number(`${rupees}.${String(paise).padStart(2, "0")}`);
}

function launchTxnRefFromId(paymentId: string): string {
  return `EXP${paymentId.replace(/-/g, "").toUpperCase().slice(0, 12)}`;
}

export async function createUpiIntentPayment(
  input: CreateUpiIntentInput
): Promise<IUpiIntentPayment> {
  const amountPaise = Number(input.amountPaise);
  if (
    !Number.isFinite(amountPaise) ||
    amountPaise !== Math.trunc(amountPaise) ||
    amountPaise < MIN_AMOUNT_PAISE ||
    amountPaise > MAX_AMOUNT_PAISE
  ) {
    const err = new Error("amountPaise must be an integer between 100 and 10000000");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  const vpa = input.payeeVpa.trim();
  if (!VPA_PATTERN.test(vpa)) {
    const err = new Error("payeeVpa is invalid");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  if (input.currency && input.currency.toUpperCase() !== "INR") {
    const err = new Error("Only INR is supported");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const employeeQuery: Record<string, unknown> = { id: input.employeeId, active: true };
  if (input.companyId) employeeQuery.companyId = input.companyId;
  const matches = await Employee.find(employeeQuery).exec();
  const employee =
    matches.length === 1
      ? matches[0]
      : matches.find((row) => row.companyId === input.companyId) || null;
  if (!employee) {
    const err = new Error(
      matches.length > 1
        ? "Multiple employees match this id; pass companyId"
        : "Employee not found"
    );
    (err as Error & { statusCode?: number }).statusCode = matches.length > 1 ? 409 : 404;
    throw err;
  }

  const paymentId = input.paymentId?.trim() || randomUUID();
  const existing = await UpiIntentPayment.findOne({ id: paymentId }).exec();
  if (existing) {
    if (existing.employeeId !== input.employeeId) {
      const err = new Error("Payment id already exists");
      (err as Error & { statusCode?: number }).statusCode = 409;
      throw err;
    }
    return existing;
  }

  const created = new UpiIntentPayment({
    id: paymentId,
    employeeId: input.employeeId,
    companyId: employee.companyId,
    amountPaise,
    currency: "INR",
    payeeName: (input.payeeName ?? "Unknown payee").slice(0, 100),
    payeeVpa: vpa,
    note: input.note?.trim().slice(0, 80),
    category: input.category?.trim() || "office",
    mcc: input.mcc?.trim() || "5999",
    paymentMethod: "UPI_INTENT",
    status: "INITIATED",
    launchTxnRef: (input.launchTxnRef ?? launchTxnRefFromId(paymentId)).slice(0, 35),
    initiatedAt: dayjs().toISOString(),
  });
  if (input.location) {
    applyLocationToRecord(created, input.location);
  }
  await created.save();
  return created;
}

async function createExpenseFromPayment(
  payment: IUpiIntentPayment
): Promise<string> {
  if (payment.expenseId) {
    return payment.expenseId;
  }

  const existingByPayment = await Transaction.findOne({ paymentId: payment.id }).exec();
  if (existingByPayment) {
    payment.expenseId = existingByPayment.id;
    await payment.save();
    return existingByPayment.id;
  }

  if (payment.upiTxnId) {
    const existingByTxn = await Transaction.findOne({
      upiRefId: payment.upiTxnId,
      paymentMethod: "UPI_INTENT",
    }).exec();
    if (existingByTxn) {
      payment.expenseId = existingByTxn.id;
      await payment.save();
      return existingByTxn.id;
    }
  }

  const employeeQuery: Record<string, unknown> = { id: payment.employeeId, active: true };
  if (payment.companyId) employeeQuery.companyId = payment.companyId;
  const employee = await Employee.findOne(employeeQuery).exec();
  const expenseId = `TXN-${payment.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const now = dayjs().toISOString();
  const expense = new Transaction({
    id: expenseId,
    employeeId: payment.employeeId,
    companyId: payment.companyId || employee?.companyId,
    employeeName: employee?.name ?? "Employee",
    department: employee?.department ?? "Unassigned",
    merchantName: payment.payeeName,
    mcc: payment.mcc || "5999",
    category: payment.category || "office",
    amount: paiseToDashboardAmount(payment.amountPaise),
    claimedAmount: paiseToDashboardAmount(payment.amountPaise),
    amountPaise: payment.amountPaise,
    dateTime: now,
    status: "pending",
    upiApp: "UPI",
    upiRefId: payment.upiTxnId || payment.upiTxnRef || "PENDING",
    isNewTx: true,
    flags:
      payment.status === "USER_CONFIRMED"
        ? [
            {
              id: `upi-user-${Date.now().toString(36)}`,
              rule: "UPI Intent",
              reason: "User confirmed without UPI callback",
              details: "Expense recorded from USER_CONFIRMED, not SUCCESS_REPORTED",
            },
          ]
        : [],
    hasMatchingAllpayRecord: false,
    purposeCategory: payment.category || "General",
    timeline: [
      {
        id: `upi-${Date.now().toString(36)}`,
        actor: "Employee app",
        action:
          payment.status === "USER_CONFIRMED"
            ? "Expense recorded from user confirmation"
            : "Expense recorded from UPI Intent SUCCESS_REPORTED",
        timestamp: now,
      },
    ],
    merchantVpa: payment.payeeVpa,
    paymentStatus: payment.status,
    paymentMethod: "UPI_INTENT",
    paymentConfirmedAt: now,
    paymentId: payment.id,
    upiTxnRef: payment.upiTxnRef,
    approvalRefNo: payment.approvalRefNo,
    upiResponseCode: payment.upiResponseCode,
    expenseSource: "EXPENZO_UPI_INTENT",
  });
  if (
    typeof payment.latitude === "number" &&
    typeof payment.longitude === "number" &&
    payment.locationCapturedAt
  ) {
    applyLocationToRecord(expense, {
      latitude: payment.latitude,
      longitude: payment.longitude,
      locationCapturedAt: payment.locationCapturedAt,
    });
  }
  await expense.save();
  payment.expenseId = expenseId;
  await payment.save();
  return expenseId;
}

export async function applyUpiIntentResult(
  input: UpiIntentResultInput
): Promise<{ payment: IUpiIntentPayment; expenseId?: string; idempotent: boolean }> {
  if (!isUpiIntentStatus(input.status)) {
    const err = new Error("Invalid payment status");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const payment = await UpiIntentPayment.findOne({ id: input.paymentId }).exec();
  if (!payment) {
    const err = new Error("Payment not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  if (input.employeeId && payment.employeeId !== input.employeeId) {
    const err = new Error("Not allowed");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }

  const nextStatus = input.status;
  const transition = applyUpiStatusTransition(payment.status, nextStatus);
  if (!transition.ok) {
    const err = new Error(`Cannot transition from ${payment.status} to ${nextStatus}`);
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const alreadyTerminalSuccess =
    payment.status === "SUCCESS_REPORTED" && nextStatus === "SUCCESS_REPORTED";
  const alreadyUserConfirmed =
    payment.status === "USER_CONFIRMED" && nextStatus === "USER_CONFIRMED";

  if (input.upiTxnId && !payment.upiTxnId) {
    payment.upiTxnId = input.upiTxnId.slice(0, 64);
  }
  if (input.upiTxnRef && !payment.upiTxnRef) {
    payment.upiTxnRef = input.upiTxnRef.slice(0, 64);
  }
  if (input.approvalRefNo && !payment.approvalRefNo) {
    payment.approvalRefNo = input.approvalRefNo.slice(0, 64);
  }
  if (input.responseCode && !payment.upiResponseCode) {
    payment.upiResponseCode = input.responseCode.slice(0, 16);
  }
  if (input.location) {
    applyLocationToRecord(payment, input.location);
  }

  payment.status = transition.status;
  payment.returnedAt = payment.returnedAt ?? dayjs().toISOString();
  if (shouldCreateExpense(transition.status) || transition.status === "FAILED" || transition.status === "CANCELLED") {
    payment.completedAt = payment.completedAt ?? dayjs().toISOString();
  }
  await payment.save();

  let expenseId = payment.expenseId;
  if (shouldCreateExpense(payment.status)) {
    expenseId = await createExpenseFromPayment(payment);
    // If expense already existed from an earlier callback, still attach location when provided.
    if (input.location && expenseId) {
      const expense = await Transaction.findOne({ id: expenseId }).exec();
      if (expense && (expense.latitude == null || expense.longitude == null)) {
        applyLocationToRecord(expense, input.location);
        await expense.save();
      }
    }
  }

  return {
    payment,
    ...(expenseId ? { expenseId } : {}),
    idempotent: alreadyTerminalSuccess || alreadyUserConfirmed,
  };
}
