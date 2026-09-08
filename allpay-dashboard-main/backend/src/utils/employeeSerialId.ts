import { randomBytes } from "node:crypto";
import { Employee } from "../models";

const SERIAL_PATTERN = /^emp(\d+)$/i;

export function isSerialEmployeeId(id: string): boolean {
  return SERIAL_PATTERN.test(String(id || "").trim());
}

function isPendingEmployeeId(id: string): boolean {
  return String(id || "").startsWith("PEND-");
}

export function normalizeSerialEmployeeId(id: string): string {
  const trimmed = String(id || "").trim();
  const match = SERIAL_PATTERN.exec(trimmed);
  if (match) return `emp${match[1]}`;
  return trimmed.toLowerCase();
}

export function makePendingEmployeeId(): string {
  return `PEND-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export async function getNextEmployeeSerialId(companyId: string): Promise<string> {
  const employees = await Employee.find({ companyId }).select("id").lean();
  let max = 0;
  for (const row of employees) {
    const match = SERIAL_PATTERN.exec(String(row.id || ""));
    if (match) max = Math.max(max, parseInt(match[1]!, 10));
  }
  return `emp${max + 1}`;
}

export function employeeIdIsAssigned(emp: { id: string; idAssigned?: boolean }): boolean {
  if (emp.idAssigned === true) return true;
  if (emp.idAssigned === false) return false;
  return !isPendingEmployeeId(emp.id);
}

/** Resolve active employee by work email (case-insensitive), optionally within a company. */
export async function findActiveEmployeeByEmail(rawEmail: string, companyId?: string) {
  const em = String(rawEmail || "").trim().toLowerCase();
  if (!em) return null;

  const base: Record<string, unknown> = { email: em, active: true };
  if (companyId) base.companyId = companyId;

  const exact = await Employee.find(base).exec();
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) {
    // Without company scope, never pick an arbitrary tenant.
    if (!companyId) return null;
    return exact.find((row) => row.companyId === companyId) || null;
  }

  const escaped = em.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexQuery: Record<string, unknown> = {
    email: { $regex: new RegExp(`^${escaped}$`, "i") },
    active: true,
  };
  if (companyId) regexQuery.companyId = companyId;
  const fuzzy = await Employee.find(regexQuery).exec();
  if (fuzzy.length === 1) return fuzzy[0]!;
  if (fuzzy.length > 1 && !companyId) return null;
  return fuzzy.find((row) => row.companyId === companyId) || null;
}

/** Resolve employee by login ID (emp1, emp0, legacy EMP-DEMO, case-insensitive serial). */
export async function findEmployeeByLoginId(rawId: string, companyId?: string) {
  const trimmed = String(rawId || "").trim();
  if (!trimmed) return null;

  const lookupId = isSerialEmployeeId(trimmed) ? normalizeSerialEmployeeId(trimmed) : trimmed;
  const scoped = (q: Record<string, unknown>) =>
    companyId ? { ...q, companyId } : q;

  let emp = await Employee.findOne(scoped({ id: lookupId, active: true })).exec();
  if (!emp && lookupId === "emp0") {
    emp = await Employee.findOne(scoped({ id: "EMP-DEMO", active: true })).exec();
  }
  if (!emp) {
    const escaped = lookupId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    emp = await Employee.findOne(
      scoped({ id: { $regex: new RegExp(`^${escaped}$`, "i") }, active: true })
    ).exec();
  }
  return emp;
}

/** All active employees sharing a serial/login id (different companies can reuse emp1). */
export async function findEmployeesByLoginId(rawId: string) {
  const trimmed = String(rawId || "").trim();
  if (!trimmed) return [];

  const lookupId = isSerialEmployeeId(trimmed) ? normalizeSerialEmployeeId(trimmed) : trimmed;
  let rows = await Employee.find({ id: lookupId, active: true }).exec();
  if (!rows.length && lookupId === "emp0") {
    rows = await Employee.find({ id: "EMP-DEMO", active: true }).exec();
  }
  if (!rows.length) {
    const escaped = lookupId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rows = await Employee.find({
      id: { $regex: new RegExp(`^${escaped}$`, "i") },
      active: true,
    }).exec();
  }
  return rows;
}

/**
 * Resolve employee for registration: must match BOTH login id and work email
 * so emp1 in Company A is not confused with emp1 in Company B.
 */
export async function findEmployeeByLoginIdAndEmail(rawId: string, rawEmail: string) {
  const em = String(rawEmail || "").trim().toLowerCase();
  if (!em) return null;

  const candidates = await findEmployeesByLoginId(rawId);
  if (!candidates.length) return null;

  const match = candidates.find(
    (row) => String(row.email || "").trim().toLowerCase() === em
  );
  return match || null;
}

export function employeeIdsMatch(storedId: string, rawId: string): boolean {
  const trimmed = String(rawId || "").trim();
  const stored = String(storedId || "").trim();
  if (!trimmed || !stored) return false;
  if (stored.toLowerCase() === trimmed.toLowerCase()) return true;
  if (isSerialEmployeeId(stored) && isSerialEmployeeId(trimmed)) {
    return normalizeSerialEmployeeId(stored) === normalizeSerialEmployeeId(trimmed);
  }
  return false;
}
