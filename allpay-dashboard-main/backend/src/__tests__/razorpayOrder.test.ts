type MockOrderState = { status: string; payment?: { id: string; amount: number; status: string } };
const razorpayOrderStore = ((globalThis as { __rzpOrders?: Map<string, MockOrderState> }).__rzpOrders ??=
  new Map<string, MockOrderState>());

jest.mock("razorpay", () => {
  let orderCounter = 0;
  const store = ((globalThis as { __rzpOrders?: Map<string, unknown> }).__rzpOrders ??=
    new Map());
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation(async () => {
        orderCounter += 1;
        const id = `order_mock_${orderCounter}`;
        store.set(id, { status: "created" });
        return { id };
      }),
      fetch: jest.fn().mockImplementation(async (orderId: string) => {
        const stored = store.get(orderId);
        return { id: orderId, status: stored?.status ?? "created" };
      }),
      fetchPayments: jest.fn().mockImplementation(async (orderId: string) => {
        const stored = store.get(orderId);
        return { items: stored?.payment ? [stored.payment] : [] };
      }),
    },
  }));
});

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import crypto from "node:crypto";
import { app } from "../server";
import { seedDatabase } from "../seed";
import { Transaction } from "../models";
import {
  confirmRazorpayPayment,
  createRazorpayOrder,
  handleRazorpayWebhookEvent,
  resetRazorpayClientForTests,
  syncCapturedOrderFromRazorpay,
  verifyPaymentSignature,
} from "../services/razorpayService";
import { setPayoutApiForTests, settleMerchantPayout } from "../services/razorpayPayoutService";

const keySecret = "test_secret";
const webhookSecret = "whsec_test";

describe("Razorpay integration", () => {
  let memoryMongo: MongoMemoryServer;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = keySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    process.env.USE_RAZORPAY_UPI = "true";
    process.env.RAZORPAYX_ACCOUNT_NUMBER = "2323230003046";
    resetRazorpayClientForTests();
    setPayoutApiForTests({
      createVpaPayout: async ({ referenceId }) => ({
        id: `pout_${referenceId}`,
        status: "processed",
        utr: `UTR${referenceId.slice(-8)}`,
      }),
      refundPayment: async () => ({ id: "rfnd_mock" }),
    });
    memoryMongo = await MongoMemoryServer.create();
    await mongoose.connect(memoryMongo.getUri());
    await mongoose.connection.db?.dropDatabase();
    await seedDatabase();
  });

  afterAll(async () => {
    setPayoutApiForTests(null);
    await mongoose.disconnect();
    await memoryMongo.stop();
  });

  it("POST /mobile/payments/create-order creates order for seed employee", async () => {
    const res = await request(app)
      .post("/api/mobile/payments/create-order")
      .send({
        txId: "TXN-RZP-1",
        amount: 250,
        employeeId: "EMP-1000",
        merchant: {
          vpa: "shop@paytm",
          name: "Corner Store",
          category: "food",
          mcc: "5812",
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.orderId).toMatch(/^order_mock_/);

    const tx = await Transaction.findOne({ id: "TXN-RZP-1" }).exec();
    expect(tx?.paymentStatus).toBe("order_created");
  });

  it("returns same order for duplicate create-order with same amount", async () => {
    const payload = {
      txId: "TXN-RZP-DUP",
      amount: 99,
      employeeId: "EMP-1000",
      merchant: { vpa: "a@paytm", name: "A", category: "office", mcc: "5999" },
    };
    const first = await request(app).post("/api/mobile/payments/create-order").send(payload);
    const second = await request(app).post("/api/mobile/payments/create-order").send(payload);
    expect(first.body.orderId).toBe(second.body.orderId);
  });

  it("returns 409 when amount changes for same txId", async () => {
    await request(app)
      .post("/api/mobile/payments/create-order")
      .send({
        txId: "TXN-RZP-409",
        amount: 50,
        employeeId: "EMP-1000",
        merchant: { vpa: "b@paytm", name: "B", category: "office", mcc: "5999" },
      });
    const res = await request(app)
      .post("/api/mobile/payments/create-order")
      .send({
        txId: "TXN-RZP-409",
        amount: 51,
        employeeId: "EMP-1000",
        merchant: { vpa: "b@paytm", name: "B", category: "office", mcc: "5999" },
      });
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown employee", async () => {
    const res = await request(app)
      .post("/api/mobile/payments/create-order")
      .send({
        txId: "TXN-RZP-NOEMP",
        amount: 10,
        employeeId: "EMP-MISSING",
        merchant: { vpa: "c@paytm", name: "C", category: "office", mcc: "5999" },
      });
    expect(res.status).toBe(404);
  });

  it("verifyPaymentSignature validates HMAC", () => {
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(true);
    expect(verifyPaymentSignature(orderId, paymentId, "bad", keySecret)).toBe(false);
  });

  it("confirms as captured when RazorpayX is not configured", async () => {
    const previousAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    delete process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const order = await createRazorpayOrder({
      txId: "TXN-CONF-NOX",
      amount: 15,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "shop@paytm", name: "Shop", category: "office", mcc: "5999" },
    });
    const paymentId = "pay_confirm_nox";
    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.orderId}|${paymentId}`)
      .digest("hex");
    const tx = await confirmRazorpayPayment({
      txId: "TXN-CONF-NOX",
      razorpay_order_id: order.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(tx.paymentStatus).toBe("payment_captured");
    expect(tx.hasMatchingAllpayRecord).toBe(true);
    process.env.RAZORPAYX_ACCOUNT_NUMBER = previousAccount;
  });

  it("pays the shop after RazorpayX account number is added later", async () => {
    const previousAccount = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    delete process.env.RAZORPAYX_ACCOUNT_NUMBER;
    const order = await createRazorpayOrder({
      txId: "TXN-CONF-LATER-X",
      amount: 18,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "later@paytm", name: "Later Shop", category: "office", mcc: "5999" },
    });
    const paymentId = "pay_later_x";
    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.orderId}|${paymentId}`)
      .digest("hex");
    const captured = await confirmRazorpayPayment({
      txId: "TXN-CONF-LATER-X",
      razorpay_order_id: order.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(captured.paymentStatus).toBe("payment_captured");

    process.env.RAZORPAYX_ACCOUNT_NUMBER = previousAccount || "2323230003046";
    const paid = await settleMerchantPayout("TXN-CONF-LATER-X");
    expect(paid?.paymentStatus).toBe("payout_processed");
    expect(paid?.razorpayPayoutId).toBeTruthy();
  });

  it("confirm with RazorpayX pays the shop immediately", async () => {
    const order = await createRazorpayOrder({
      txId: "TXN-CONF-1",
      amount: 10,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "d@paytm", name: "D", category: "office", mcc: "5999" },
    });
    const paymentId = "pay_confirm_1";
    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.orderId}|${paymentId}`)
      .digest("hex");

    const tx = await confirmRazorpayPayment({
      txId: "TXN-CONF-1",
      razorpay_order_id: order.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(tx.paymentStatus).toBe("payout_processed");
    expect(tx.hasMatchingAllpayRecord).toBe(true);
    expect(tx.razorpayPayoutId).toBeTruthy();
  });

  it("rejects personal UPI IDs", async () => {
    const res = await request(app)
      .post("/api/mobile/payments/create-order")
      .send({
        txId: "TXN-RZP-P2P",
        amount: 100,
        employeeId: "EMP-1000",
        merchant: { vpa: "friend@oksbi", name: "Friend", category: "other", mcc: "0000" },
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/merchant \/ shop/i);
  });

  it("webhook payment.captured pays the shop and marks payout_processed", async () => {
    const order = await createRazorpayOrder({
      txId: "TXN-WH-1",
      amount: 20,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "e@paytm", name: "E", category: "office", mcc: "5999" },
    });
    const payload = JSON.stringify({
      event: "payment.captured",
      id: "evt_capture_1",
      payload: {
        payment: {
          entity: {
            id: "pay_webhook_1",
            order_id: order.orderId,
            amount: 2000,
          },
        },
      },
    });
    const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    const result = await handleRazorpayWebhookEvent(payload, signature, "evt_capture_1");
    expect(result.ok).toBe(true);

    const tx = await Transaction.findOne({ id: "TXN-WH-1" }).exec();
    expect(tx?.paymentStatus).toBe("payout_processed");
    expect(tx?.hasMatchingAllpayRecord).toBe(true);
    expect(tx?.razorpayPayoutId).toMatch(/^pout_/);
    expect(tx?.payoutUtr).toBeTruthy();
  });

  it("duplicate webhook event is idempotent", async () => {
    const order = await createRazorpayOrder({
      txId: "TXN-WH-DUP",
      amount: 20,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "f@paytm", name: "F", category: "office", mcc: "5999" },
    });
    const payload = JSON.stringify({
      event: "payment.captured",
      id: "evt_capture_dup",
      payload: {
        payment: {
          entity: {
            id: "pay_webhook_dup",
            order_id: order.orderId,
            amount: 2000,
          },
        },
        order: { entity: { receipt: "TXN-WH-DUP" } },
      },
    });
    const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    const first = await handleRazorpayWebhookEvent(payload, signature, "evt_capture_dup");
    const second = await handleRazorpayWebhookEvent(payload, signature, "evt_capture_dup");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
  });

  it("refunds the employee when shop payout fails", async () => {
    setPayoutApiForTests({
      createVpaPayout: async () => {
        throw new Error("Insufficient RazorpayX balance");
      },
      refundPayment: async () => ({ id: "rfnd_fail_1" }),
    });
    const order = await createRazorpayOrder({
      txId: "TXN-WH-REFUND",
      amount: 30,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "shop@paytm", name: "Shop", category: "office", mcc: "5999" },
    });
    const payload = JSON.stringify({
      event: "payment.captured",
      id: "evt_refund_1",
      payload: {
        payment: {
          entity: {
            id: "pay_refund_1",
            order_id: order.orderId,
            amount: 3000,
          },
        },
      },
    });
    const signature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    await handleRazorpayWebhookEvent(payload, signature, "evt_refund_1");
    const tx = await Transaction.findOne({ id: "TXN-WH-REFUND" }).exec();
    expect(tx?.paymentStatus).toBe("refunded");
    expect(tx?.refundId).toBe("rfnd_fail_1");
    expect(tx?.hasMatchingAllpayRecord).toBe(false);
    setPayoutApiForTests({
      createVpaPayout: async ({ referenceId }) => ({
        id: `pout_${referenceId}`,
        status: "processed",
        utr: `UTR${referenceId.slice(-8)}`,
      }),
      refundPayment: async () => ({ id: "rfnd_mock" }),
    });
  });

  it("late payment.captured webhook does not reset payout_initiated", async () => {
    const order = await createRazorpayOrder({
      txId: "TXN-WH-NORESET",
      amount: 20,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "h@paytm", name: "H", category: "office", mcc: "5999" },
    });
    const paymentId = "pay_confirm_noreset";
    const signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.orderId}|${paymentId}`)
      .digest("hex");
    const confirmed = await confirmRazorpayPayment({
      txId: "TXN-WH-NORESET",
      razorpay_order_id: order.orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(["payout_initiated", "payout_processed"]).toContain(confirmed.paymentStatus);

    const payload = JSON.stringify({
      event: "payment.captured",
      id: "evt_late_capture",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: order.orderId,
            amount: 2000,
          },
        },
      },
    });
    const webhookSignature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    await handleRazorpayWebhookEvent(payload, webhookSignature, "evt_late_capture");
    const tx = await Transaction.findOne({ id: "TXN-WH-NORESET" }).exec();
    expect(tx?.paymentStatus).not.toBe("payment_captured");
    expect(["payout_initiated", "payout_processed"]).toContain(tx?.paymentStatus);
  });

  it("syncs a paid Razorpay order after checkout is closed", async () => {
    process.env.RAZORPAYX_ACCOUNT_NUMBER = "";
    const order = await createRazorpayOrder({
      txId: "TXN-SYNC-PAID",
      amount: 1,
      employeeId: "EMP-1000",
      employeeName: "Employee 1",
      department: "Engineering",
      merchant: { vpa: "g@paytm", name: "G", category: "office", mcc: "5999" },
    });
    razorpayOrderStore.set(order.orderId, {
      status: "paid",
      payment: { id: "pay_synced_1", amount: 100, status: "captured" },
    });

    const tx = await syncCapturedOrderFromRazorpay("TXN-SYNC-PAID");
    expect(tx?.paymentStatus).toBe("payment_captured");
    expect(tx?.razorpayPaymentId).toBe("pay_synced_1");
    process.env.RAZORPAYX_ACCOUNT_NUMBER = "2323230003046";
  });

  it("rejects invalid webhook signature", async () => {
    const res = await request(app)
      .post("/api/webhooks/razorpay")
      .set("x-razorpay-signature", "invalid")
      .set("Content-Type", "application/json")
      .send(Buffer.from("{}"));
    expect(res.status).toBe(400);
  });
});
