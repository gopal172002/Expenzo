import type { Request, RequestHandler, Response, Router } from "express";
import dayjs from "dayjs";
import { Attendance, Transaction } from "./models";
import {
  appendTicketMessage,
  openClaimTicket,
  type ClaimTicket,
} from "./services/claimTicketService";
import {
  claimContextFromTransaction,
  verifyClaim,
} from "./services/verification/verificationService";
import { verificationTtlCache } from "./services/ttlCache";
import { bustAnalyticsCache } from "./services/adminAnalyticsService";

function clean(doc: unknown) {
  const copy = { ...(doc as Record<string, unknown>) };
  delete copy["_id"];
  delete copy["__v"];
  return copy;
}

function pathParam(req: Request, key: string): string | undefined {
  const raw = req.params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? String(value) : undefined;
}

/**
 * Re-run verification for a transaction and persist the verdict.
 * Opens a query ticket automatically when the claim cannot be cleared.
 */
export async function verifyAndPersist(transactionId: string, companyId?: string) {
  const query: Record<string, unknown> = { id: transactionId };
  if (companyId) query.companyId = companyId;
  const tx = await Transaction.findOne(query);
  if (!tx) return null;

  const scopedCompanyId = String(companyId || tx.companyId || "").trim();
  if (!scopedCompanyId) {
    throw new Error("Transaction is missing companyId — cannot verify across tenants");
  }
  if (tx.companyId && companyId && tx.companyId !== companyId) {
    return null;
  }
  if (!tx.companyId) {
    tx.companyId = scopedCompanyId;
  }

  const result = await verifyClaim(
    claimContextFromTransaction({
      id: tx.id,
      employeeId: tx.employeeId,
      companyId: scopedCompanyId,
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
    })
  );

  tx.verification = result;
  tx.verificationScore = result.riskScore;
  tx.verificationVerdict = result.verdict;
  tx.hasMatchingAllpayRecord = result.evidenceStrength === "transaction_matched";

  const needsQuery = result.verdict === "needs_review" || result.verdict === "high_risk";
  const existing = tx.claimTicket as ClaimTicket | undefined;
  const alreadyResolved =
    existing?.status === "resolved_approved" || existing?.status === "resolved_rejected";

  if (needsQuery && !existing) {
    const ticket = openClaimTicket(result);
    tx.claimTicket = ticket;
    tx.claimTicketStatus = ticket.status;
  } else if (existing) {
    tx.claimTicketStatus = existing.status;
  }

  if (needsQuery && !alreadyResolved && tx.status !== "rejected" && tx.status !== "approved") {
    tx.status = "flagged";
  }

  // Mirror failed checks into the legacy flag list so existing screens keep working.
  // These stay admin-only: the employee learns about issues through the claim query
  // thread, which is written in plain language and never exposes detection internals.
  // Receipt forensics is skipped here because the image pipeline writes its own flag.
  const VERIFICATION_FLAG_PREFIX = `${tx.id}-vrf-`;
  const verificationFlags = result.checks
    .filter((check) => check.outcome === "fail" && check.id !== "receipt_forensics")
    .map((check) => ({
      id: `${VERIFICATION_FLAG_PREFIX}${check.id}`,
      rule: check.label,
      reason: check.label,
      details: check.explanation,
      adminOnly: true,
    }));
  const otherFlags = (Array.isArray(tx.flags) ? tx.flags : []).filter(
    (flag) => !String(flag.id ?? "").startsWith(VERIFICATION_FLAG_PREFIX)
  );
  tx.flags = [...otherFlags, ...verificationFlags];

  await tx.save();
  verificationTtlCache.deletePrefix(`vq:${companyId}`);
  bustAnalyticsCache(companyId);
  return { transaction: tx, verification: result };
}

/** Admin-side verification review and the finance half of the claim query thread. */
export function registerVerificationRoutes(router: Router, requireFinance: RequestHandler) {
  router.get("/admin/verification/queue", requireFinance, async (req: Request, res: Response) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const limit = Math.min(Number(req.query["limit"]) || 100, 500);
      const cacheKey = `vq:${companyId}:${limit}`;
      const cached = verificationTtlCache.get(cacheKey) as
        | {
            ok: true;
            items: unknown[];
            counts: {
              total: number;
              highRisk: number;
              awaitingEmployee: number;
              employeeReplied: number;
            };
          }
        | undefined;
      if (cached) {
        return res.json(cached);
      }

      const docs = await Transaction.find({
        companyId,
        verificationVerdict: { $in: ["needs_review", "high_risk"] },
      })
        .sort({ verificationScore: -1, dateTime: -1 })
        .limit(limit)
        .lean()
        .exec();

      const items = docs.map((doc) => clean(doc));
      let highRisk = 0;
      let awaitingEmployee = 0;
      let employeeReplied = 0;
      for (const doc of docs) {
        if (doc.verificationVerdict === "high_risk") highRisk += 1;
        if (doc.claimTicketStatus === "awaiting_employee") awaitingEmployee += 1;
        if (doc.claimTicketStatus === "employee_replied") employeeReplied += 1;
      }

      const payload = {
        ok: true as const,
        items,
        counts: { total: items.length, highRisk, awaitingEmployee, employeeReplied },
      };
      verificationTtlCache.set(cacheKey, payload);
      res.json(payload);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post(
    "/admin/transactions/:id/verify",
    requireFinance,
    async (req: Request, res: Response) => {
      try {
        const companyId = req.adminUser?.companyId;
        if (!companyId) {
          return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
        }
        const id = pathParam(req, "id");
        if (!id) return res.status(400).json({ error: "Missing transaction id" });
        const result = await verifyAndPersist(id, companyId);
        if (!result) return res.status(404).json({ error: "Transaction not found" });
        res.json({ ok: true, verification: result.verification, transactionId: id });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    }
  );

  router.post(
    "/admin/transactions/:id/claim-message",
    requireFinance,
    async (req: Request, res: Response) => {
      try {
        const companyId = req.adminUser?.companyId;
        if (!companyId) {
          return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
        }
        const id = pathParam(req, "id");
        if (!id) return res.status(400).json({ error: "Missing transaction id" });
        const body = String((req.body as { message?: string }).message || "").trim();
        if (!body) return res.status(400).json({ error: "Message is required" });

        const tx = await Transaction.findOne({ id, companyId });
        if (!tx) return res.status(404).json({ error: "Transaction not found" });

        const ticket = appendTicketMessage(tx.claimTicket as ClaimTicket | undefined, {
          author: req.adminUser?.name || "Admin",
          authorRole: "admin",
          body,
        });
        tx.claimTicket = ticket;
        tx.claimTicketStatus = ticket.status;
        tx.timeline.push({
          id: `${tx.id}-query-${Date.now()}`,
          actor: req.adminUser?.name || "Admin",
          action: "Raised a query with the employee",
          timestamp: dayjs().toISOString(),
        });
        await tx.save();
        verificationTtlCache.deletePrefix(`vq:${companyId}`);
        res.json({ ok: true, claimTicket: ticket });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    }
  );

  router.put("/admin/attendance", requireFinance, async (req: Request, res: Response) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const body = req.body as {
        employeeId?: string;
        date?: string;
        punchIn?: string;
        punchOut?: string;
        workLocation?: string;
      };
      const employeeId = String(body.employeeId || "").trim();
      const date = String(body.date || "").trim();
      if (!employeeId) return res.status(400).json({ error: "employeeId is required" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
      }
      const workLocation = String(body.workLocation || "office");
      if (!["office", "remote", "travel", "leave"].includes(workLocation)) {
        return res.status(400).json({ error: "workLocation must be office, remote, travel, or leave" });
      }

      const saved = await Attendance.findOneAndUpdate(
        { employeeId, date, companyId },
        {
          $set: {
            id: `ATT-${companyId}-${employeeId}-${date}`,
            employeeId,
            companyId,
            date,
            workLocation,
            source: "admin",
            ...(body.punchIn ? { punchIn: body.punchIn } : {}),
            ...(body.punchOut ? { punchOut: body.punchOut } : {}),
          },
        },
        { upsert: true, new: true }
      );
      res.json({ ok: true, attendance: clean(saved!.toObject()) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get("/admin/attendance", requireFinance, async (req: Request, res: Response) => {
    try {
      const companyId = req.adminUser?.companyId;
      if (!companyId) {
        return res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
      }
      const employeeId = req.query["employeeId"];
      const filter: Record<string, unknown> = { companyId };
      if (employeeId) filter.employeeId = String(employeeId);
      const docs = await Attendance.find(filter).sort({ date: -1 }).limit(200).lean();
      res.json({ ok: true, attendance: docs.map((doc) => clean(doc)) });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
}
