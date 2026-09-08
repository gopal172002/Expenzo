import express from "express";
import { Employee } from "../models";
export type { EmployeePayload } from "../types/employeeRequest";

/** After JWT: resolve active Employee by auth email, or 403. */
export async function requireEmployeeUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const tokenUser = (req as express.Request & {
    user?: { email?: string; employeeId?: string; companyId?: string };
  }).user;
  if (!tokenUser?.email && !tokenUser?.employeeId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = tokenUser.email ? String(tokenUser.email).trim().toLowerCase() : "";
  const companyId = tokenUser.companyId ? String(tokenUser.companyId) : undefined;
  const emailQuery: Record<string, unknown> = { email, active: true };
  if (companyId) emailQuery.companyId = companyId;
  let emp = email ? await Employee.findOne(emailQuery).exec() : null;
  if (!emp && tokenUser.employeeId) {
    const idQuery: Record<string, unknown> = {
      id: String(tokenUser.employeeId),
      active: true,
    };
    if (companyId) idQuery.companyId = companyId;
    emp = await Employee.findOne(idQuery).exec();
  }
  if (!emp) {
    return res.status(403).json({
      error:
        "Employee access required. Log in on the Employee tab with your Employee ID (e.g. emp0 for demo).",
      code: "NOT_EMPLOYEE",
    });
  }
  req.employeeUser = {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    role: emp.role,
    active: emp.active,
    onboarded: emp.onboarded,
    travelApproved: emp.travelApproved,
    companyId: emp.companyId,
  };
  next();
}

export function employeeIdFromReq(req: express.Request): string {
  const id = req.employeeUser?.id;
  if (!id) throw new Error("Missing employee context");
  return id;
}
