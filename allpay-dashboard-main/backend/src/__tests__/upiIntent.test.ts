import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../server";
import { seedDatabase } from "../seed";
import { Transaction, UpiIntentPayment } from "../models";
import { applyUpiIntentResult, createUpiIntentPayment } from "../services/upiIntentService";

describe("UPI Intent payments", () => {
  let memoryMongo: MongoMemoryServer;

  beforeAll(async () => {
    memoryMongo = await MongoMemoryServer.create();
    await mongoose.connect(memoryMongo.getUri());
    await mongoose.connection.db?.dropDatabase();
    await seedDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await memoryMongo.stop();
  });

  it("POST /v1/payments creates INITIATED payment in paise", async () => {
    const res = await request(app).post("/api/v1/payments").send({
      paymentId: "11111111-1111-4111-8111-111111111111",
      amountPaise: 50000,
      currency: "INR",
      payeeVpa: "abcshop@upi",
      payeeName: "ABC Shop",
      paymentMethod: "UPI_INTENT",
      employeeId: "EMP-1000",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("INITIATED");
    const stored = await UpiIntentPayment.findOne({ id: res.body.paymentId }).exec();
    expect(stored?.amountPaise).toBe(50000);
  });

  it("create is idempotent for the same paymentId", async () => {
    const payload = {
      paymentId: "22222222-2222-4222-8222-222222222222",
      amountPaise: 10000,
      payeeVpa: "shop@upi",
      employeeId: "EMP-1000",
      paymentMethod: "UPI_INTENT",
    };
    const first = await request(app).post("/api/v1/payments").send(payload);
    const second = await request(app).post("/api/v1/payments").send(payload);
    expect(first.body.paymentId).toBe(second.body.paymentId);
    expect(await UpiIntentPayment.countDocuments({ id: payload.paymentId })).toBe(1);
  });

  it("rejects invalid state transition FAILED → INITIATED", async () => {
    const created = await createUpiIntentPayment({
      paymentId: "33333333-3333-4333-8333-333333333333",
      employeeId: "EMP-1000",
      amountPaise: 20000,
      payeeVpa: "shop@upi",
      payeeName: "Shop",
    });
    await applyUpiIntentResult({
      paymentId: created.id,
      employeeId: "EMP-1000",
      status: "FAILED",
    });
    await expect(
      applyUpiIntentResult({
        paymentId: created.id,
        employeeId: "EMP-1000",
        status: "INITIATED",
      })
    ).rejects.toThrow(/Cannot transition/);
  });

  it("SUCCESS_REPORTED creates one expense and is idempotent", async () => {
    const created = await createUpiIntentPayment({
      paymentId: "44444444-4444-4444-8444-444444444444",
      employeeId: "EMP-1000",
      amountPaise: 50025,
      payeeVpa: "shop@upi",
      payeeName: "ABC Store",
    });
    const first = await applyUpiIntentResult({
      paymentId: created.id,
      employeeId: "EMP-1000",
      status: "SUCCESS_REPORTED",
      upiTxnId: "412345678901",
      upiTxnRef: "EXP123456",
      responseCode: "00",
    });
    const second = await applyUpiIntentResult({
      paymentId: created.id,
      employeeId: "EMP-1000",
      status: "SUCCESS_REPORTED",
      upiTxnId: "412345678901",
      upiTxnRef: "EXP123456",
      responseCode: "00",
    });
    expect(first.expenseId).toBeTruthy();
    expect(second.expenseId).toBe(first.expenseId);
    expect(second.idempotent).toBe(true);
    expect(await Transaction.countDocuments({ paymentId: created.id })).toBe(1);
    const expense = await Transaction.findOne({ paymentId: created.id }).exec();
    expect(expense?.amountPaise).toBe(50025);
    expect(expense?.paymentStatus).toBe("SUCCESS_REPORTED");
    expect(expense?.expenseSource).toBe("EXPENZO_UPI_INTENT");
  });

  it("USER_CONFIRMED is stored separately from SUCCESS_REPORTED", async () => {
    const created = await createUpiIntentPayment({
      paymentId: "55555555-5555-4555-8555-555555555555",
      employeeId: "EMP-1000",
      amountPaise: 15000,
      payeeVpa: "friend@upi",
      payeeName: "Friend",
    });
    const result = await applyUpiIntentResult({
      paymentId: created.id,
      employeeId: "EMP-1000",
      status: "USER_CONFIRMED",
    });
    expect(result.payment.status).toBe("USER_CONFIRMED");
    const expense = await Transaction.findOne({ paymentId: created.id }).exec();
    expect(expense?.paymentStatus).toBe("USER_CONFIRMED");
    expect(expense?.flags.length).toBeGreaterThan(0);
  });
});
