import { createHash, randomBytes, randomInt } from "node:crypto";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";
import { Company, Employee, MobileOnboardingSession } from "../models";
import { employeeIdIsAssigned } from "../utils/employeeSerialId";
import { findEmployeeByInviteCode, normalizeInviteCode } from "../utils/inviteCode";

const JWT_SECRET = process.env.JWT_SECRET || "allpay_super_secret";
const SESSION_HOURS = 24;
const OTP_MINUTES = 10;

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function issueOnboardingToken(sessionId: string): string {
  return jwt.sign({ typ: "mobile_onboarding", sessionId }, JWT_SECRET, { expiresIn: "24h" });
}

function issueEmployeeToken(emp: { id: string; companyId?: string }): string {
  const payload: { typ: string; employeeId: string; companyId?: string } = {
    typ: "employee",
    employeeId: emp.id,
  };
  if (emp.companyId) payload.companyId = emp.companyId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "60d" });
}

export function resolveOnboardingSessionId(authHeader?: string, bodyToken?: string): string | null {
  const bearer = authHeader?.split(" ")[1]?.trim();
  const raw = bearer || bodyToken?.trim();
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, JWT_SECRET) as { typ?: string; sessionId?: string };
    if (decoded.typ === "mobile_onboarding" && decoded.sessionId) {
      return decoded.sessionId;
    }
  } catch {
    return null;
  }
  return null;
}

async function loadActiveSession(sessionId: string) {
  const session = await MobileOnboardingSession.findOne({ id: sessionId }).exec();
  if (!session || session.completed) return null;
  if (dayjs(session.expiresAt).isBefore(dayjs())) return null;
  return session;
}

async function resolveCompanyName(companyId?: string | null): Promise<string> {
  if (!companyId) return process.env.COMPANY_NAME || "AllPay";
  const company = await Company.findOne({ id: companyId }).select("name").lean();
  return company?.name || process.env.COMPANY_NAME || "AllPay";
}

async function profilePayload(emp: InstanceType<typeof Employee>) {
  return {
    name: emp.name,
    email: emp.email,
    department: emp.department,
    employeeId: employeeIdIsAssigned(emp) ? emp.id : null,
    idAssigned: employeeIdIsAssigned(emp),
    phone: emp.phone || null,
    companyId: emp.companyId || null,
    companyName: await resolveCompanyName(emp.companyId),
  };
}

function scopedEmployeeQuery(session: { employeeId: string; companyId?: string }) {
  const q: Record<string, unknown> = { id: session.employeeId, active: true };
  if (session.companyId) q.companyId = session.companyId;
  return q;
}

function generateOtp(): string {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    return "123456";
  }
  return String(randomInt(100000, 999999));
}

async function deliverOtp(email: string, phone: string | undefined, otp: string, employeeId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[AllPay mobile OTP] Employee ${employeeId} — email ${email}${phone ? `, phone ${phone}` : ""}: ${otp}`
    );
  }
}

/** Step 1 — mobile app enters invite code; returns employee profile from dashboard DB. */
export async function verifyMobileInviteCode(inviteCodeRaw: string) {
  const inviteCode = normalizeInviteCode(inviteCodeRaw);
  if (!inviteCode) {
    return { ok: false as const, status: 400, message: "Invite code is required." };
  }

  const emp = await findEmployeeByInviteCode(inviteCode);
  if (!emp) {
    return { ok: false as const, status: 404, message: "Invalid invite code. Ask your admin for a new one." };
  }

  const companyName = await resolveCompanyName(emp.companyId);
  const sessionId = `mob-onb-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const now = dayjs();
  await MobileOnboardingSession.create({
    id: sessionId,
    inviteCode,
    employeeId: emp.id,
    companyId: emp.companyId,
    step: "profile",
    otpVerified: false,
    completed: false,
    expiresAt: now.add(SESSION_HOURS, "hour").toISOString(),
    createdAt: now.toISOString(),
  });

  return {
    ok: true as const,
    onboardingToken: issueOnboardingToken(sessionId),
    step: "profile" as const,
    nextStep: "otp" as const,
    inviteCode,
    companyId: emp.companyId || null,
    companyName,
    alreadyOnboarded: Boolean(emp.onboarded),
    profile: await profilePayload(emp),
  };
}

/** Step 2 — verify profile (mobile app sends email, fullName, phone). */
export async function confirmMobileProfile(
  sessionId: string,
  updates?: { phone?: string; name?: string; email?: string }
) {
  const session = await loadActiveSession(sessionId);
  if (!session) {
    return {
      ok: false as const,
      status: 401,
      message: "Session expired. Enter your invite code again.",
    };
  }

  const emp = await Employee.findOne(scopedEmployeeQuery(session)).exec();
  if (!emp) {
    return { ok: false as const, status: 404, message: "Employee record not found." };
  }

  if (updates?.email) {
    const nextEmail = String(updates.email).trim().toLowerCase();
    if (nextEmail && nextEmail !== String(emp.email).trim().toLowerCase()) {
      const emailQuery: Record<string, unknown> = { email: nextEmail, active: true };
      if (session.companyId) emailQuery.companyId = session.companyId;
      const byEmail = await Employee.findOne(emailQuery).exec();
      if (byEmail && byEmail.id !== emp.id) {
        if (
          byEmail.inviteCode &&
          normalizeInviteCode(byEmail.inviteCode) !== normalizeInviteCode(session.inviteCode)
        ) {
          return {
            ok: false as const,
            status: 409,
            message: "That work email belongs to a different employee invite.",
          };
        }
      }
      emp.email = nextEmail;
    }
  }
  if (updates?.name?.trim()) emp.name = updates.name.trim();
  if (updates?.phone !== undefined) emp.phone = String(updates.phone || "").trim();
  await emp.save();

  session.step = "otp";
  if (updates?.phone !== undefined) session.phone = String(updates.phone || "").trim();
  await session.save();

  return {
    ok: true as const,
    step: "otp" as const,
    nextStep: "otp" as const,
    profile: await profilePayload(emp),
  };
}

export async function sendMobileOnboardingOtp(sessionId: string) {
  const session = await loadActiveSession(sessionId);
  if (!session) {
    return {
      ok: false as const,
      status: 401,
      message: "Session expired. Enter your invite code again.",
    };
  }

  const activeEmp = await Employee.findOne(scopedEmployeeQuery(session)).exec();
  if (!activeEmp) {
    return { ok: false as const, status: 404, message: "Employee record not found." };
  }

  const otp = generateOtp();
  session.otpHash = hashOtp(otp);
  session.otpExpiresAt = dayjs().add(OTP_MINUTES, "minute").toISOString();
  session.otpVerified = false;
  session.step = "otp";
  await session.save();

  await deliverOtp(activeEmp.email, session.phone || activeEmp.phone, otp, activeEmp.id);

  return {
    ok: true as const,
    step: "otp" as const,
    nextStep: "otp" as const,
    expiresInMinutes: OTP_MINUTES,
    message: "OTP sent to your registered email/phone.",
    ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
  };
}

export async function verifyMobileOnboardingOtp(sessionId: string, otpRaw: string) {
  const session = await loadActiveSession(sessionId);
  if (!session) {
    return {
      ok: false as const,
      status: 401,
      message: "Session expired. Enter your invite code again.",
    };
  }

  const otp = String(otpRaw || "").trim();
  if (!otp) {
    return { ok: false as const, status: 400, message: "OTP is required." };
  }
  if (!session.otpHash || !session.otpExpiresAt) {
    return { ok: false as const, status: 400, message: "Request an OTP first." };
  }
  if (dayjs(session.otpExpiresAt).isBefore(dayjs())) {
    return { ok: false as const, status: 400, message: "OTP expired. Request a new one." };
  }
  if (hashOtp(otp) !== session.otpHash) {
    return { ok: false as const, status: 400, message: "Incorrect OTP." };
  }

  const emp = await Employee.findOne(scopedEmployeeQuery(session)).exec();
  if (!emp) {
    return { ok: false as const, status: 404, message: "Employee record not found." };
  }

  session.otpVerified = true;
  session.step = "complete";
  await session.save();

  return {
    ok: true as const,
    step: "complete" as const,
    nextStep: "complete" as const,
  };
}

/** Step 4 — finish mobile onboarding and return employee JWT. */
export async function completeMobileOnboarding(sessionId: string) {
  const session = await MobileOnboardingSession.findOne({ id: sessionId }).exec();
  if (!session || session.completed) {
    return {
      ok: false as const,
      status: 401,
      message: "Session expired. Enter your invite code again.",
    };
  }
  if (dayjs(session.expiresAt).isBefore(dayjs())) {
    return { ok: false as const, status: 401, message: "Session expired. Enter your invite code again." };
  }
  if (!session.otpVerified) {
    return {
      ok: false as const,
      status: 400,
      message: "Complete OTP verification before finishing onboarding.",
    };
  }

  const emp = await Employee.findOne(scopedEmployeeQuery(session)).exec();
  if (!emp) {
    return { ok: false as const, status: 404, message: "Employee record not found." };
  }

  if (!emp.inviteToken) {
    emp.inviteToken = randomBytes(24).toString("hex");
  }
  emp.onboarded = true;
  await emp.save();

  session.completed = true;
  session.step = "complete";
  await session.save();

  const token = issueEmployeeToken(emp);

  return {
    ok: true as const,
    token,
    employeeId: emp.id,
    companyId: emp.companyId || null,
    profile: await profilePayload(emp),
    message: "Onboarding complete. Welcome to AllPay!",
  };
}

/** Returning employee — invite code + work email (code alone is guessable as PREFIX_EMPID). */
export async function loginWithInviteCode(inviteCodeRaw: string, emailRaw?: string) {
  const inviteCode = normalizeInviteCode(inviteCodeRaw);
  if (!inviteCode) {
    return { ok: false as const, status: 400, message: "Invite code is required." };
  }

  const email = String(emailRaw || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return {
      ok: false as const,
      status: 400,
      message: "Work email is required with the invite code for login.",
    };
  }

  const emp = await findEmployeeByInviteCode(inviteCode);
  if (!emp) {
    return { ok: false as const, status: 404, message: "Invalid invite code. Ask your admin for a new one." };
  }

  if (String(emp.email || "").trim().toLowerCase() !== email) {
    return {
      ok: false as const,
      status: 403,
      message: "Invite code and work email do not match.",
    };
  }

  if (!emp.onboarded) {
    return {
      ok: false as const,
      status: 403,
      needsOnboarding: true as const,
      message: "Complete onboarding with this invite code first.",
    };
  }

  if (!emp.companyId) {
    return {
      ok: false as const,
      status: 403,
      message: "Employee is not linked to a company. Ask your admin to invite you again.",
    };
  }

  if (!emp.inviteToken) {
    emp.inviteToken = randomBytes(24).toString("hex");
    await emp.save();
  }

  const token = issueEmployeeToken(emp);

  return {
    ok: true as const,
    token,
    employeeId: emp.id,
    companyId: emp.companyId || null,
    profile: await profilePayload(emp),
    message: "Welcome back!",
  };
}
