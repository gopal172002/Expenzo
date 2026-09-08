import { AdminUser } from "../models";

export const ADMIN_ROLES = ["super_admin", "finance_manager", "hr_manager", "auditor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  finance_manager: "Finance Manager",
  hr_manager: "HR Manager",
  auditor: "Auditor",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

/**
 * Super Admin always keeps read and write; the console shows these locked.
 * Auditors are read-only by policy.
 */
export function resolvePermissions(
  role: AdminRole,
  requested: { canRead?: boolean; canWrite?: boolean }
): { canRead: boolean; canWrite: boolean } {
  if (role === "super_admin") return { canRead: true, canWrite: true };
  if (role === "auditor") return { canRead: true, canWrite: false };
  return {
    canRead: requested.canRead ?? true,
    canWrite: requested.canWrite ?? true,
  };
}

export async function countActiveSuperAdmins(companyId: string, excludeId?: string): Promise<number> {
  const query: Record<string, unknown> = { role: "super_admin", active: true, companyId };
  if (excludeId) query["id"] = { $ne: excludeId };
  return AdminUser.countDocuments(query);
}

/**
 * At least one active Super Admin must remain so the workspace is never locked out.
 */
export async function assertNotLastSuperAdmin(
  adminId: string,
  companyIdHint?: string
): Promise<string | null> {
  const query: Record<string, unknown> = { id: adminId };
  if (companyIdHint) query.companyId = companyIdHint;
  const target = await AdminUser.findOne(query).lean();
  if (!target) return null;
  if (target.role !== "super_admin" || !target.active) return null;
  const companyId = String((target as { companyId?: string }).companyId || companyIdHint || "");
  if (!companyId) return null;
  const remaining = await countActiveSuperAdmins(companyId, adminId);
  if (remaining > 0) return null;
  return "This is the last active Super Admin. Add or activate another Super Admin before changing this one.";
}
