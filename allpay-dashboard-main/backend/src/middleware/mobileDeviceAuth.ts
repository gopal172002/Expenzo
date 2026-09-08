import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "allpay_super_secret";

export type MobileRequest = Request & {
  mobileEmployeeId?: string;
  mobileCompanyId?: string;
};

/**
 * Mobile devices may authenticate with either:
 * - Header `X-AllPay-Sync-Secret` matching `MOBILE_SYNC_SECRET`, or
 * - `Authorization: Bearer <token>` from employee JWT (invite or employee-token)
 *
 * In production, `MOBILE_SYNC_SECRET` must be set (open sync is refused).
 * In local/test without a secret, requests are allowed only for development.
 */
export function mobileDeviceAuth(req: MobileRequest, res: Response, next: NextFunction) {
  const configuredSecret = process.env.MOBILE_SYNC_SECRET;
  const headerSecret = req.headers["x-allpay-sync-secret"];
  const provided =
    typeof headerSecret === "string"
      ? headerSecret
      : Array.isArray(headerSecret)
        ? headerSecret[0]
        : undefined;

  if (configuredSecret && provided === configuredSecret) {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        typ?: string;
        employeeId?: string;
        companyId?: string;
      };
      if (decoded.typ === "employee" && decoded.employeeId) {
        req.mobileEmployeeId = decoded.employeeId;
        if (decoded.companyId) req.mobileCompanyId = decoded.companyId;
        return next();
      }
    } catch {
      /* fall through */
    }
  }

  const allowOpenDev =
    !configuredSecret &&
    (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development" || !process.env.NODE_ENV);

  if (allowOpenDev) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[AllPay] MOBILE_SYNC_SECRET unset — mobile sync endpoints are open (dev only)");
    }
    return next();
  }

  return res.status(401).json({
    ok: false,
    message: "Unauthorized: set X-AllPay-Sync-Secret or use a valid employee token",
  });
}
