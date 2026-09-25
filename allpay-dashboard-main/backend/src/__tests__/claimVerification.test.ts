/** Verification queue, claim query thread, and attendance cross-check over HTTP. */
jest.mock("../services/s3Service", () => ({
  uploadFile: jest.fn().mockResolvedValue("http://mock.localstack/receipts/tx/verify.png"),
  receiptStorageMode: jest.fn().mockReturnValue("mongo"),
}));

import dayjs from "dayjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../server";
import { seedDatabase } from "../seed";
import { Attendance, Transaction } from "../models";
import { verifyAndPersist } from "../verificationRoutes";
import { DEMO_COMPANY_ID } from "../tenant";

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
const EMP = "emp0";

async function makeClaim(over: Record<string, unknown> = {}) {
  const id = `TX-VER-${Math.random().toString(36).slice(2, 9)}`;
  await Transaction.create({
    id,
    employeeId: EMP,
    employeeName: "Demo Employee",
    department: "Operations",
    merchantName: "Delhi Metro",
    mcc: "4111",
    category: "Travel",
    amount: 45,
    claimedAmount: 45,
    dateTime: dayjs().subtract(1, "day").hour(15).minute(30).second(0).toISOString(),
    status: "pending",
    upiApp: "GPay",
    upiRefId: `UPI-${id}`,
    isNewTx: true,
    flags: [],
    hasMatchingAllpayRecord: false,
    purposeCategory: "Travel",
    timeline: [],
    companyId: DEMO_COMPANY_ID,
    ...over,
  });
  return id;
}

async function createSettledPayment(input: {
  id: string;
  amount: number;
  merchantName: string;
  dateTime: string;
  category?: string;
  mcc?: string;
}) {
  await Transaction.create({
    id: input.id,
    employeeId: EMP,
    employeeName: "Demo Employee",
    department: "Operations",
    merchantName: input.merchantName,
    merchantVpa: "shop@upi",
    mcc: input.mcc ?? "5541",
    category: input.category ?? "Fuel",
    amount: input.amount,
    claimedAmount: input.amount,
    dateTime: input.dateTime,
    status: "pending",
    upiApp: "Razorpay",
    upiRefId: `UTR-${input.id}`,
    isNewTx: true,
    flags: [],
    hasMatchingAllpayRecord: true,
    purposeCategory: input.category ?? "Fuel",
    timeline: [],
    companyId: DEMO_COMPANY_ID,
    paymentStatus: "payout_processed",
    paymentMethod: "razorpay_merchant_payout",
    orderAmountPaise: Math.round(input.amount * 100),
    capturedAmountPaise: Math.round(input.amount * 100),
    payoutProcessedAt: input.dateTime,
    paymentConfirmedAt: input.dateTime,
  });
}

describe("Claim verification", () => {
  let adminToken: string;
  let employeeToken: string;
  let memoryMongo: MongoMemoryServer | null = null;

  beforeAll(async () => {
    if (process.env.USE_LIVE_MONGO) {
      await mongoose.connect(process.env.MONGO_URI!);
    } else {
      memoryMongo = await MongoMemoryServer.create();
      await mongoose.connect(memoryMongo.getUri());
    }
    await mongoose.connection.db?.dropDatabase();
    await seedDatabase();

    const admin = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    adminToken = admin.body.token as string;

    const employee = await request(app)
      .post("/api/auth/login")
      .send({ employeeId: EMP, password: "password123", portal: "employee" });
    employeeToken = employee.body.token as string;
    expect(employeeToken).toBeTruthy();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (memoryMongo) await memoryMongo.stop();
  });

  afterEach(async () => {
    await Promise.all([
      Transaction.deleteMany({ $or: [{ id: /^TX-VER-/ }, { id: /^PAY-TX-VER-/ }] }),
      Attendance.deleteMany({ employeeId: EMP }),
    ]);
  });

  describe("attendance cross-check", () => {
    it("flags a travel claim made during an office shift and opens a query", async () => {
      const id = await makeClaim();
      const claim = await Transaction.findOne({ id }).lean();
      const date = dayjs(claim!.dateTime).format("YYYY-MM-DD");

      const saved = await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date,
          punchIn: dayjs(claim!.dateTime).hour(9).minute(30).toISOString(),
          punchOut: dayjs(claim!.dateTime).hour(18).minute(30).toISOString(),
          workLocation: "office",
        });
      expect(saved.status).toBe(200);

      const res = await request(app)
        .post(`/api/admin/transactions/${id}/verify`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.verification.failedCheckIds).toContain("attendance_conflict");

      const updated = await Transaction.findOne({ id }).lean();
      expect(updated!.status).toBe("flagged");
      expect(updated!.claimTicketStatus).toBe("awaiting_employee");

      const ticket = updated!.claimTicket as { messages: Array<{ body: string }> };
      expect(ticket.messages[0]!.body).toMatch(/punched in at the office/i);
      expect(ticket.messages[0]!.body).toMatch(/could you explain/i);
    });

    it("clears the same claim when the employee was logged as travelling", async () => {
      const id = await makeClaim();
      const claim = await Transaction.findOne({ id }).lean();
      await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date: dayjs(claim!.dateTime).format("YYYY-MM-DD"),
          punchIn: dayjs(claim!.dateTime).hour(9).toISOString(),
          punchOut: dayjs(claim!.dateTime).hour(18).toISOString(),
          workLocation: "travel",
        });

      const res = await request(app)
        .post(`/api/admin/transactions/${id}/verify`)
        .set(authHeader(adminToken));
      expect(res.body.verification.failedCheckIds).not.toContain("attendance_conflict");
    });

    it("rejects a malformed attendance date", async () => {
      const res = await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({ employeeId: EMP, date: "21-08-2026", workLocation: "office" });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown work location", async () => {
      const res = await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({ employeeId: EMP, date: "2026-08-21", workLocation: "moon base" });
      expect(res.status).toBe(400);
    });
  });

  describe("AllPay payment matching", () => {
    it("verifies a claim backed by a settled AllPay payment", async () => {
      const id = await makeClaim({
        merchantName: "Indian Oil",
        category: "Fuel",
        mcc: "5541",
        amount: 2150,
        claimedAmount: 2150,
      });
      await Transaction.updateOne(
        { id },
        {
          $set: {
            paymentStatus: "payout_processed",
            paymentMethod: "razorpay_merchant_payout",
            orderAmountPaise: 215000,
            capturedAmountPaise: 215000,
            payoutProcessedAt: (await Transaction.findOne({ id }).lean())?.dateTime,
            paymentConfirmedAt: (await Transaction.findOne({ id }).lean())?.dateTime,
          },
        }
      );

      const res = await request(app)
        .post(`/api/admin/transactions/${id}/verify`)
        .set(authHeader(adminToken));
      expect(res.body.verification.verdict).toBe("verified");
      expect(res.body.verification.evidenceStrength).toBe("transaction_matched");

      const updated = await Transaction.findOne({ id }).lean();
      expect(updated!.hasMatchingAllpayRecord).toBe(true);
      expect(updated!.status).not.toBe("flagged");
    });

    it("marks a claim inflated above the recorded payment as high risk", async () => {
      const id = await makeClaim({
        merchantName: "Indian Oil",
        category: "Fuel",
        mcc: "5541",
        amount: 6000,
        claimedAmount: 6000,
      });
      const claim = await Transaction.findOne({ id }).lean();

      await createSettledPayment({
        id: `PAY-${id}`,
        amount: 2150,
        merchantName: "Indian Oil",
        dateTime: claim!.dateTime,
        category: "Fuel",
        mcc: "5541",
      });

      const res = await request(app)
        .post(`/api/admin/transactions/${id}/verify`)
        .set(authHeader(adminToken));
      expect(res.body.verification.verdict).toBe("high_risk");
      expect(res.body.verification.headline).toMatch(/higher than the amount actually paid/i);
    });
  });

  describe("claim query thread", () => {
    it("carries a query from finance to the employee and back", async () => {
      const id = await makeClaim();
      const claim = await Transaction.findOne({ id }).lean();
      await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date: dayjs(claim!.dateTime).format("YYYY-MM-DD"),
          punchIn: dayjs(claim!.dateTime).hour(9).toISOString(),
          punchOut: dayjs(claim!.dateTime).hour(18).toISOString(),
          workLocation: "office",
        });
      await verifyAndPersist(id);

      const reply = await request(app)
        .post(`/api/employee/transactions/${id}/claim-reply`)
        .set(authHeader(employeeToken))
        .send({ message: "I travelled to a client site that afternoon; my manager approved it." });
      expect(reply.status).toBe(200);
      expect(reply.body.claimTicket.status).toBe("employee_replied");

      const afterReply = await Transaction.findOne({ id }).lean();
      expect(afterReply!.claimTicketStatus).toBe("employee_replied");

      const adminMessage = await request(app)
        .post(`/api/admin/transactions/${id}/claim-message`)
        .set(authHeader(adminToken))
        .send({ message: "Thanks. Please attach the client visit approval." });
      expect(adminMessage.body.claimTicket.status).toBe("awaiting_employee");
      expect(adminMessage.body.claimTicket.messages).toHaveLength(3);
    });

    it("closes the thread when finance approves the claim", async () => {
      const id = await makeClaim();
      const claim = await Transaction.findOne({ id }).lean();
      await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date: dayjs(claim!.dateTime).format("YYYY-MM-DD"),
          punchIn: dayjs(claim!.dateTime).hour(9).toISOString(),
          punchOut: dayjs(claim!.dateTime).hour(18).toISOString(),
          workLocation: "office",
        });
      await verifyAndPersist(id);

      const approved = await request(app)
        .post("/api/admin/transactions/approve")
        .set(authHeader(adminToken))
        .send({ transactionId: id, amount: 45 });
      expect(approved.status).toBe(200);

      const updated = await Transaction.findOne({ id }).lean();
      expect(updated!.claimTicketStatus).toBe("resolved_approved");

      const late = await request(app)
        .post(`/api/employee/transactions/${id}/claim-reply`)
        .set(authHeader(employeeToken))
        .send({ message: "One more thing" });
      expect(late.status).toBe(409);
    });

    it("rejects an empty reply", async () => {
      const id = await makeClaim();
      await verifyAndPersist(id);
      const res = await request(app)
        .post(`/api/employee/transactions/${id}/claim-reply`)
        .set(authHeader(employeeToken))
        .send({ message: "   " });
      expect(res.status).toBe(400);
    });

    it("does not let an employee reply on another employee's claim", async () => {
      const id = await makeClaim({ employeeId: "EMP-1000", employeeName: "Employee 1" });
      const res = await request(app)
        .post(`/api/employee/transactions/${id}/claim-reply`)
        .set(authHeader(employeeToken))
        .send({ message: "Not mine" });
      expect(res.status).toBe(404);
    });
  });

  describe("employee data exposure", () => {
    it("hides the verification report and forensic scores from the employee portal", async () => {
      const id = await makeClaim({ receiptFraudScore: 88, receiptFraudTier: "high_risk" });
      await verifyAndPersist(id);

      const res = await request(app)
        .get(`/api/employee/transactions/${id}`)
        .set(authHeader(employeeToken));
      expect(res.status).toBe(200);
      const body = JSON.stringify(res.body);
      expect(res.body.transaction.verification).toBeUndefined();
      expect(res.body.transaction.verificationScore).toBeUndefined();
      expect(res.body.transaction.receiptFraudScore).toBeUndefined();
      expect(body).not.toMatch(/synthetic generation/i);
      expect(body).not.toMatch(/forensics scored/i);
    });
  });

  describe("verification queue", () => {
    it("lists risky claims with counts, highest risk first", async () => {
      const clean = await makeClaim({
        merchantName: "Indian Oil",
        category: "Fuel",
        mcc: "5541",
        amount: 2150,
        claimedAmount: 2150,
      });
      await Transaction.updateOne(
        { id: clean },
        {
          $set: {
            paymentStatus: "payout_processed",
            paymentMethod: "razorpay_merchant_payout",
            orderAmountPaise: 215000,
            capturedAmountPaise: 215000,
          },
        }
      );
      await verifyAndPersist(clean, DEMO_COMPANY_ID);

      const risky = await makeClaim({ amount: 45, claimedAmount: 45 });
      const riskyClaim = await Transaction.findOne({ id: risky }).lean();
      await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date: dayjs(riskyClaim!.dateTime).format("YYYY-MM-DD"),
          punchIn: dayjs(riskyClaim!.dateTime).hour(9).toISOString(),
          punchOut: dayjs(riskyClaim!.dateTime).hour(18).toISOString(),
          workLocation: "office",
        });
      await verifyAndPersist(risky);

      const res = await request(app)
        .get("/api/admin/verification/queue")
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      const ids = res.body.items.map((item: { id: string }) => item.id);
      expect(ids).toContain(risky);
      expect(ids).not.toContain(clean);
      expect(res.body.counts.awaitingEmployee).toBeGreaterThanOrEqual(1);

      const scores = res.body.items.map((item: { verificationScore: number }) => item.verificationScore);
      expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a));
    });

    it("requires finance access", async () => {
      const res = await request(app).get("/api/admin/verification/queue");
      expect(res.status).toBe(401);
    });
  });

  describe("idempotency", () => {
    it("re-running verification does not duplicate flags or reopen a closed query", async () => {
      const id = await makeClaim();
      const claim = await Transaction.findOne({ id }).lean();
      await request(app)
        .put("/api/admin/attendance")
        .set(authHeader(adminToken))
        .send({
          employeeId: EMP,
          date: dayjs(claim!.dateTime).format("YYYY-MM-DD"),
          punchIn: dayjs(claim!.dateTime).hour(9).toISOString(),
          punchOut: dayjs(claim!.dateTime).hour(18).toISOString(),
          workLocation: "office",
        });

      await verifyAndPersist(id);
      const first = await Transaction.findOne({ id }).lean();
      const firstFlagCount = (first!.flags as unknown[]).length;
      const firstMessages = (first!.claimTicket as { messages: unknown[] }).messages.length;

      await verifyAndPersist(id);
      await verifyAndPersist(id);
      const third = await Transaction.findOne({ id }).lean();

      expect((third!.flags as unknown[]).length).toBe(firstFlagCount);
      expect((third!.claimTicket as { messages: unknown[] }).messages.length).toBe(firstMessages);
      expect(third!.verificationScore).toBe(first!.verificationScore);
    });
  });
});
