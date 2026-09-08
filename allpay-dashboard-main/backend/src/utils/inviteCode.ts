import { randomInt } from "node:crypto";
import { Company, Employee } from "../models";
import { getCompanyInvitePrefix, normalizeInvitePrefix } from "../tenant";

const LEGACY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Normalize invite codes; keeps underscore for PREFIX_EMPLOYEEID. */
export function normalizeInviteCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");
}

export function isLegacyAllPayInviteCode(code: string): boolean {
  return /^ALLPAY[A-Z0-9]{6}$/.test(normalizeInviteCode(code));
}

export function buildInviteCode(prefix: string, employeeId: string): string {
  const p = normalizeInvitePrefix(prefix);
  const id = String(employeeId || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (p.length < 2 || !id) {
    throw new Error("Invite code requires a company prefix and employee id");
  }
  return `${p}_${id}`;
}

/**
 * Human-readable code for mobile app entry, e.g. MCR_58847 / DEM_EMP1.
 * Globally unique because prefix is unique per company.
 */
export async function generateUniqueInviteCode(
  companyId: string,
  employeeId: string
): Promise<string> {
  if (!companyId) throw new Error("companyId is required to generate an invite code");
  if (!employeeId || String(employeeId).startsWith("PEND-")) {
    throw new Error("Assign an employee id before generating an invite code");
  }

  const prefix = await getCompanyInvitePrefix(companyId);
  const code = buildInviteCode(prefix, employeeId);
  const exists = await Employee.findOne({
    inviteCode: code,
    $or: [{ companyId: { $ne: companyId } }, { id: { $ne: employeeId } }],
  })
    .select("_id")
    .lean();
  if (exists) {
    throw new Error(`Invite code ${code} is already in use`);
  }
  return code;
}

/** Legacy ALLPAY****** generator kept only for dual-read test fixtures if needed. */
export async function generateLegacyAllPayInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let suffix = "";
    for (let i = 0; i < 6; i += 1) {
      suffix += LEGACY_CODE_CHARS[randomInt(0, LEGACY_CODE_CHARS.length)]!;
    }
    const code = `ALLPAY${suffix}`;
    const exists = await Employee.findOne({ inviteCode: code }).select("_id").lean();
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

/** Resolve employee by invite code globally (mobile onboarding / login). */
export async function findEmployeeByInviteCode(raw: string) {
  const code = normalizeInviteCode(raw);
  if (!code) return null;
  return Employee.findOne({ inviteCode: code, active: true }).exec();
}

export async function ensureEmployeeInviteCode(emp: {
  id: string;
  inviteCode?: string;
  companyId?: string;
  save: () => Promise<unknown>;
}): Promise<string> {
  if (!emp.companyId) {
    throw new Error("Employee is missing companyId");
  }
  if (!emp.id || String(emp.id).startsWith("PEND-")) {
    throw new Error("Assign an employee id before generating an invite code");
  }

  const desired = await generateUniqueInviteCode(emp.companyId, emp.id);
  const current = emp.inviteCode ? normalizeInviteCode(emp.inviteCode) : "";
  if (current === desired) return desired;

  // Refresh legacy ALLPAY codes and any mismatched prefix codes.
  emp.inviteCode = desired;
  await emp.save();
  return desired;
}

/** Backfill PREFIX_ID invite codes for all employees with an assigned id. */
export async function migrateEmployeeInviteCodes(): Promise<{ updated: number; skipped: number }> {
  const companies = await Company.find().select({ id: 1, invitePrefix: 1 }).lean();
  const prefixByCompany = new Map<string, string>();
  for (const c of companies) {
    if (c.id && c.invitePrefix) {
      prefixByCompany.set(c.id, normalizeInvitePrefix(c.invitePrefix));
    }
  }

  const employees = await Employee.find({
    companyId: { $exists: true, $ne: "" },
    id: { $not: /^PEND-/i },
  }).exec();

  let updated = 0;
  let skipped = 0;
  for (const emp of employees) {
    if (!emp.companyId) {
      skipped += 1;
      continue;
    }
    try {
      let prefix = prefixByCompany.get(emp.companyId);
      if (!prefix) {
        prefix = await getCompanyInvitePrefix(emp.companyId);
        prefixByCompany.set(emp.companyId, prefix);
      }
      const desired = buildInviteCode(prefix, emp.id);
      if (normalizeInviteCode(emp.inviteCode || "") === desired) {
        skipped += 1;
        continue;
      }
      emp.inviteCode = desired;
      await emp.save();
      updated += 1;
    } catch {
      skipped += 1;
    }
  }
  return { updated, skipped };
}
