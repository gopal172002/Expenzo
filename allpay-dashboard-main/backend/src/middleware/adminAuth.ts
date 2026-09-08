import type express from "express";
import { AdminUser } from "../models";
import { ensureCompanyDefaults } from "../tenant";

export type AdminPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  twoFactor: boolean;
  companyId: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: AdminPayload;
    }
  }
}

function toPayload(doc: { toObject: () => Record<string, unknown> }): AdminPayload {
  const o = doc.toObject();
  return {
    id: String(o["id"] ?? ""),
    name: String(o["name"] ?? ""),
    email: String(o["email"] ?? ""),
    role: String(o["role"] ?? ""),
    active: Boolean(o["active"]),
    twoFactor: Boolean(o["twoFactor"]),
    companyId: String(o["companyId"] ?? ""),
  };
}

/** After JWT: resolve active AdminUser by auth email + company, or 403. */
export async function requireAdminUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const tokenUser = (req as express.Request & { user?: { email?: string; companyId?: string } }).user;
  if (!tokenUser?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = String(tokenUser.email).trim().toLowerCase();
  const tokenCompanyId = String(tokenUser.companyId || "").trim();

  let admin = tokenCompanyId
    ? await AdminUser.findOne({ email, companyId: tokenCompanyId, active: true })
    : null;
  if (!admin) {
    const matches = await AdminUser.find({ email, active: true }).exec();
    if (matches.length === 1) {
      admin = matches[0]!;
    } else if (matches.length > 1 && tokenCompanyId) {
      admin = matches.find((row) => row.companyId === tokenCompanyId) || null;
    } else if (matches.length > 1) {
      return res.status(403).json({
        error: "Multiple admin workspaces found for this email. Log in again to refresh company context.",
        code: "AMBIGUOUS_ADMIN_COMPANY",
      });
    }
  }
  if (!admin) {
    return res.status(403).json({ error: "Admin access required", code: "NOT_ADMIN" });
  }
  if (!admin.companyId) {
    return res.status(403).json({
      error: "Admin account is not linked to a company workspace. Sign out and log in again.",
      code: "NO_COMPANY",
    });
  }
  if (tokenCompanyId && admin.companyId !== tokenCompanyId) {
    return res.status(403).json({
      error: "Admin token company does not match admin workspace.",
      code: "COMPANY_MISMATCH",
    });
  }
  await ensureCompanyDefaults(admin.companyId);
  req.adminUser = toPayload(admin);
  next();
}

function isSuper(r: string) {
  return r === "super_admin";
}

/**
 * super_admin is always allowed; others must be in the allowlist.
 */
export function requireRoles(...allowed: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const a = req.adminUser;
    if (!a) return res.status(403).json({ error: "Admin access required" });
    if (isSuper(a.role) || allowed.includes(a.role)) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden for this role", code: "RBAC_FORBIDDEN", role: a.role, allowed });
  };
}
