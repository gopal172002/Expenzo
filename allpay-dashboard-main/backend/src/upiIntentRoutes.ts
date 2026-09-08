import type { Router } from "express";
import { mobileDeviceAuth, type MobileRequest } from "./middleware/mobileDeviceAuth";
import { applyUpiIntentResult, createUpiIntentPayment } from "./services/upiIntentService";
import { UpiIntentPayment } from "./models";

export function registerUpiIntentRoutes(router: Router): void {
  router.post("/v1/payments", mobileDeviceAuth, async (req: MobileRequest, res) => {
    try {
      const body = req.body as {
        paymentId?: string;
        amountPaise?: number;
        currency?: string;
        payeeVpa?: string;
        payeeName?: string;
        note?: string;
        category?: string;
        mcc?: string;
        paymentMethod?: string;
        launchTxnRef?: string;
        employeeId?: string;
      };

      const employeeId = req.mobileEmployeeId || body.employeeId?.trim();
      if (!employeeId) {
        return res.status(400).json({ ok: false, message: "employeeId is required" });
      }
      if (req.mobileEmployeeId && body.employeeId && req.mobileEmployeeId !== body.employeeId.trim()) {
        return res.status(403).json({ ok: false, message: "employeeId does not match token" });
      }
      if (body.paymentMethod && body.paymentMethod !== "UPI_INTENT") {
        return res.status(400).json({ ok: false, message: "paymentMethod must be UPI_INTENT" });
      }
      if (body.amountPaise == null || !body.payeeVpa) {
        return res.status(400).json({
          ok: false,
          message: "amountPaise and payeeVpa are required",
        });
      }

      const payment = await createUpiIntentPayment({
        paymentId: body.paymentId,
        employeeId,
        companyId: req.mobileCompanyId,
        amountPaise: Number(body.amountPaise),
        currency: body.currency,
        payeeVpa: body.payeeVpa,
        payeeName: body.payeeName,
        note: body.note,
        category: body.category,
        mcc: body.mcc,
        launchTxnRef: body.launchTxnRef,
      });

      res.json({
        ok: true,
        paymentId: payment.id,
        status: payment.status,
      });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ ok: false, message: (error as Error).message });
    }
  });

  router.post("/v1/payments/:paymentId/result", mobileDeviceAuth, async (req: MobileRequest, res) => {
    try {
      const paymentIdParam = req.params["paymentId"];
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;
      if (!paymentId) {
        return res.status(400).json({ ok: false, message: "paymentId is required" });
      }
      const body = req.body as {
        status?: string;
        upiTxnId?: string;
        upiTxnRef?: string;
        approvalRefNo?: string;
        responseCode?: string;
        employeeId?: string;
      };
      if (!body.status) {
        return res.status(400).json({ ok: false, message: "status is required" });
      }

      const result = await applyUpiIntentResult({
        paymentId,
        employeeId: req.mobileEmployeeId || body.employeeId,
        status: body.status,
        upiTxnId: body.upiTxnId,
        upiTxnRef: body.upiTxnRef,
        approvalRefNo: body.approvalRefNo,
        responseCode: body.responseCode,
      });

      res.json({
        ok: true,
        paymentId: result.payment.id,
        status: result.payment.status,
        expenseId: result.expenseId ?? null,
        idempotent: result.idempotent,
      });
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ ok: false, message: (error as Error).message });
    }
  });

  router.get("/v1/payments/:paymentId", mobileDeviceAuth, async (req: MobileRequest, res) => {
    try {
      const paymentIdParam = req.params["paymentId"];
      const paymentId = Array.isArray(paymentIdParam) ? paymentIdParam[0] : paymentIdParam;
      if (!paymentId) {
        return res.status(400).json({ ok: false, message: "paymentId is required" });
      }
      const payment = await UpiIntentPayment.findOne({ id: paymentId }).exec();
      if (!payment) {
        return res.status(404).json({ ok: false, message: "Payment not found" });
      }
      if (req.mobileEmployeeId && payment.employeeId !== req.mobileEmployeeId) {
        return res.status(403).json({ ok: false, message: "Not allowed" });
      }
      res.json({
        ok: true,
        paymentId: payment.id,
        status: payment.status,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
        payeeVpa: payment.payeeVpa,
        payeeName: payment.payeeName,
        expenseId: payment.expenseId ?? null,
        upiTxnId: payment.upiTxnId ?? null,
        upiTxnRef: payment.upiTxnRef ?? null,
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: (error as Error).message });
    }
  });
}
