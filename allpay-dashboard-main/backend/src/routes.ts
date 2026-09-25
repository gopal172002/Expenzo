import express from "express";
import { randomBytes } from "node:crypto";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import {
  AuthUser,
  Company,
  Employee,
  Transaction,
  ExpensePolicy,
  AlertConfig,
  AdminUser,
  BillingPlan,
  ExportAudit
} from "./models";
import { uploadFile } from "./services/s3Service";
import { loadReceiptFromMongo, receiptFileToBuffer } from "./services/receiptStorageService";
import { analyzeReceiptFraud } from "./services/receiptFraud/receiptFraudService";
import { buildReceiptFraudFlags } from "./utils/employeeTransactionView";
import { syncPaymentProofStatus } from "./utils/paymentProofSync";
import { requireAdminUser, requireRoles } from "./middleware/adminAuth";
import { registerAdminConsoleRoutes } from "./adminConsoleRoutes";
import { registerVerificationRoutes } from "./verificationRoutes";
import { closeClaimTicket, type ClaimTicket } from "./services/claimTicketService";
import {
  assertNotLastSuperAdmin,
  isAdminRole,
  resolvePermissions,
} from "./services/adminAccessService";
import { registerEmployeeRoutes } from "./employeeRoutes";
import { registerMobileOnboardingRoutes } from "./mobileOnboardingRoutes";
import { settleMerchantPayout } from "./services/razorpayPayoutService";
import { MerchantPayeeError } from "./services/merchantPayee";
import {
  getDefaultBootstrapTxLimit,
  parseTransactionQuery
} from "./utils/transactionQuery";
import {
  bustAnalyticsCache,
  getAggregated,
  getDailySpend,
} from "./services/adminAnalyticsService";
import type { TimelineBucket } from "./services/adminAnalyticsService";
import { verificationTtlCache } from "./services/ttlCache";
import { runPolicyPreview } from "./services/policyPreviewService";
import type { ExpensePolicy as PolicyPreviewBody } from "./services/analyticsTypes";
import {
  evaluateLiveTransaction,
  nextPolicyIdFromDb,
} from "./services/policyEnforcementService";
import { mobileDeviceAuth, type MobileRequest } from "./middleware/mobileDeviceAuth";
import {
  mapMobileStatusToDashboard,
  mobileTxToDashboardFields,
  type MobileTransactionPayload
} from "./services/mobileTransactionMapper";
import {
  applyLocationToRecord,
  locationFieldsFromMobile,
  parsePaymentLocation,
} from "./services/paymentLocation";
import {
  canSubmitReimbursement,
  mergeMobileSyncFields,
  reimbursementBlockedMessage
} from "./services/paymentFieldGuard";
import {
  confirmRazorpayPayment,
  createRazorpayOrder,
  markCheckoutOpened,
  syncCapturedOrderFromRazorpay
} from "./services/razorpayService";
import { isShopPayoutEnabled, type PaymentStatus } from "./services/razorpayConfig";
import { explainPaymentStatus } from "./services/paymentStatusExplain";
import {
  employeeIdIsAssigned,
  findActiveEmployeeByEmail,
  findEmployeeByLoginId,
  findEmployeeByLoginIdAndEmail,
  findEmployeesByLoginId,
  getNextEmployeeSerialId,
  isSerialEmployeeId,
  makePendingEmployeeId,
  normalizeSerialEmployeeId,
} from "./utils/employeeSerialId";
import {
  buildInviteCode,
  ensureEmployeeInviteCode,
  generateUniqueInviteCode,
  normalizeInviteCode,
} from "./utils/inviteCode";
import {
  createCompanyRecord,
  ensureAdminCompany,
  ensureUniqueInvitePrefix,
  getCompanyInvitePrefix,
  normalizeInvitePrefix,
} from "./tenant";

const router = express.Router();

function requireCompanyId(req: express.Request, res: express.Response): string | null {
  const companyId = req.adminUser?.companyId;
  if (!companyId) {
    res.status(403).json({ error: "Admin company workspace missing", code: "NO_COMPANY" });
    return null;
  }
  return companyId;
}

/** Serve receipt images stored in MongoDB (public URL uses unguessable id). */
router.get("/receipts/:receiptId", async (req, res) => {
  try {
    const rawId = req.params["receiptId"];
    const receiptId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!receiptId || !/^[a-f0-9]{32}$/i.test(receiptId)) {
      return res.status(400).json({ error: "Invalid receipt id" });
    }
    const file = await loadReceiptFromMongo(receiptId);
    const buffer = receiptFileToBuffer(file?.data);
    if (!file || !buffer?.length) {
      return res.status(404).json({ error: "Receipt not found" });
    }
    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (file.originalName) {
      res.setHeader("Content-Disposition", `inline; filename="${file.originalName.replace(/"/g, "")}"`);
    }
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function formatEmployeeDoc(emp: { toObject: () => Record<string, unknown> }) {
  const o = emp.toObject() as Record<string, unknown>;
  delete o._id;
  delete o.__v;
  return o;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const JWT_SECRET = process.env.JWT_SECRET || "allpay_super_secret";

const R_FIN = requireRoles("super_admin", "finance_manager");
const R_HR = requireRoles("super_admin", "finance_manager", "hr_manager");
const R_BILL = requireRoles("super_admin");
const R_ADM = requireRoles("super_admin");
const R_EX = requireRoles("super_admin", "finance_manager", "auditor");
const R_ANAL = requireRoles("super_admin", "finance_manager", "hr_manager", "auditor");

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as express.Request & { user?: Record<string, unknown> }).user = decoded as Record<
      string,
      unknown
    >;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

function formatTransactionDoc(doc: { toObject: () => Record<string, unknown> }) {
  const obj = doc.toObject();
  if (obj["isNewTx"] !== undefined) {
    obj["isNew"] = obj["isNewTx"];
    delete obj["isNewTx"];
  }
  return obj;
}

function formatTransactionLean(doc: Record<string, unknown>) {
  const obj = { ...doc };
  delete obj["_id"];
  delete obj["__v"];
  if (obj["isNewTx"] !== undefined) {
    obj["isNew"] = obj["isNewTx"];
    delete obj["isNewTx"];
  }
  return obj;
}

function bustCompanyReadCaches(companyId?: string | null) {
  if (!companyId) return;
  bustAnalyticsCache(companyId);
  verificationTtlCache.deletePrefix(`vq:${companyId}`);
}

async function listTransactionsFromQuery(
  raw: Record<string, string | string[] | undefined>,
  options: { bootstrapDefaultLimit?: number; companyId?: string } = {}
) {
  const q: Record<string, string | string[] | undefined> = { ...raw };
  if (options.bootstrapDefaultLimit != null && q["limit"] == null && q["page"] == null) {
    q["page"] = "1";
    q["limit"] = String(options.bootstrapDefaultLimit);
  }
  const { page, limit, skip, filter } = parseTransactionQuery(q);
  const scopedFilter =
    options.companyId != null ? { ...filter, companyId: options.companyId } : filter;
  const [items, total] = await Promise.all([
    Transaction.find(scopedFilter).sort({ dateTime: -1 }).skip(skip).limit(limit).lean().exec(),
    Transaction.countDocuments(scopedFilter),
  ]);
  return {
    transactions: items.map((row) => formatTransactionLean(row as Record<string, unknown>)),
    transactionPage: page,
    transactionPageSize: limit,
    transactionTotal: total,
    hasMoreTransactions: page * limit < total,
  };
}

// --- AUTH ROUTES ---
router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, ...rest } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await AuthUser.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ ok: false, message: "Account already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const id = `usr_${Date.now().toString(36)}`;
    const createdAt = new Date().toISOString();
    const companyName = String(rest.companyName || "Company").trim() || "Company";

    const companyId = await createCompanyRecord({
      name: companyName,
      companySize: rest.companySize,
      companyType: rest.companyType,
      monthlySpend: rest.monthlySpend,
      ownerEmail: normalizedEmail,
    });

    const newUser = new AuthUser({
      id,
      email: normalizedEmail,
      passwordHash,
      createdAt,
      companyId,
      ...rest,
      companyName,
    });

    await newUser.save();

    // Company signup = company admin for an empty workspace.
    let adminRecord = await AdminUser.findOne({ email: normalizedEmail, active: true });
    if (!adminRecord) {
      const adminId = `ADM-${Date.now().toString(36).toUpperCase()}`;
      adminRecord = await AdminUser.create({
        id: adminId,
        name: String(rest.fullName || normalizedEmail).trim() || normalizedEmail,
        email: normalizedEmail,
        role: "super_admin",
        active: true,
        twoFactor: false,
        canRead: true,
        canWrite: true,
        companyId,
      });
    } else if (!adminRecord.companyId) {
      adminRecord.companyId = companyId;
      await adminRecord.save();
    }

    const token = jwt.sign(
      { id, email: normalizedEmail, companyId, adminId: adminRecord.id, portal: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userPayload = { ...newUser.toObject() } as Record<string, unknown>;
    delete userPayload.passwordHash;
    delete userPayload._id;
    delete userPayload.__v;

    userPayload["adminId"] = adminRecord.id;
    userPayload["adminRole"] = adminRecord.role;
    userPayload["companyId"] = companyId;
    userPayload["portal"] = "admin";

    res.json({ ok: true, user: userPayload, token });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/auth/employee/register", async (req, res) => {
  try {
    const { email, password, fullName, department, name, employeeId: employeeIdIn } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      department?: string;
      name?: string;
      employeeId?: string;
    };
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const displayName = String(fullName || name || "").trim();
    const rawEmployeeId = String(employeeIdIn || "").trim();

    if (!normalizedEmail) {
      return res.status(400).json({ ok: false, message: "Work email is required." });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ ok: false, message: "Password must be at least 8 characters." });
    }

    const existingAuth = await AuthUser.findOne({ email: normalizedEmail });
    if (existingAuth) {
      const linkedEmp = await Employee.findOne({ email: normalizedEmail, active: true }).exec();
      if (linkedEmp && employeeIdIsAssigned(linkedEmp)) {
        const idHint = rawEmployeeId && normalizeSerialEmployeeId(rawEmployeeId) !== linkedEmp.id
          ? ` Your assigned ID is ${linkedEmp.id}.`
          : "";
        return res.status(400).json({
          ok: false,
          code: "ALREADY_REGISTERED",
          employeeId: linkedEmp.id,
          message: `You already completed registration.${idHint} Log in with Employee ID ${linkedEmp.id} and the password you set earlier (not a new password here).`,
        });
      }
      return res.status(400).json({
        ok: false,
        code: "ALREADY_REGISTERED_PENDING",
        message:
          "You already registered with this email. Wait for your admin to assign an Employee ID, then log in with that ID and your original password.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);
    const createdAt = new Date().toISOString();

    /** Admin assigned emp1 — employee completes registration with ID + email + password. */
    if (rawEmployeeId) {
      // Match BOTH id and email so emp1 in another company is not selected.
      const emp = await findEmployeeByLoginIdAndEmail(rawEmployeeId, normalizedEmail);
      if (!emp) {
        const byEmail = await findActiveEmployeeByEmail(normalizedEmail);
        if (byEmail && employeeIdIsAssigned(byEmail)) {
          return res.status(400).json({
            ok: false,
            message: `This email is registered as Employee ID ${byEmail.id}. Use that ID (not ${String(rawEmployeeId).trim()}).`,
          });
        }
        const byId = await findEmployeesByLoginId(rawEmployeeId);
        if (byId.length > 0) {
          return res.status(400).json({
            ok: false,
            message:
              "This email does not match the Employee ID for your company. Use the work email your admin invited.",
          });
        }
        return res.status(400).json({
          ok: false,
          message: "Invalid Employee ID, or your admin has not assigned one yet.",
        });
      }
      if (!employeeIdIsAssigned(emp)) {
        return res.status(400).json({
          ok: false,
          message: "Invalid Employee ID, or your admin has not assigned one yet.",
        });
      }
      if (!emp.companyId) {
        return res.status(400).json({
          ok: false,
          message: "This employee is not linked to a company. Ask your admin to invite you again.",
        });
      }
      const nameForAccount = displayName || emp.name;
      await AuthUser.create({
        id: `usr_${Date.now().toString(36)}`,
        email: normalizedEmail,
        fullName: nameForAccount,
        companyName: "—",
        companySize: "—",
        monthlySpend: "—",
        companyType: "—",
        passwordHash,
        createdAt,
        companyId: emp.companyId,
      });
      if (displayName && displayName !== emp.name) {
        emp.name = displayName;
        await emp.save();
      }
      return res.json({
        ok: true,
        ready: true,
        employeeId: emp.id,
        message: `Account ready. Log in with Employee ID ${emp.id} and your password.`,
      });
    }

    if (!displayName) {
      return res.status(400).json({ ok: false, message: "Full name is required." });
    }

    // Realistic flow: admin must invite first. Employee only sets password against that invite.
    const emailMatches = await Employee.find({ email: normalizedEmail, active: true }).exec();
    if (emailMatches.length > 1) {
      return res.status(400).json({
        ok: false,
        code: "AMBIGUOUS_EMAIL",
        message:
          "This work email is linked to more than one company. Use “I have my Employee ID” with your ID and email.",
      });
    }
    let employeeRecord = emailMatches[0] || null;
    if (!employeeRecord) {
      return res.status(400).json({
        ok: false,
        code: "INVITE_REQUIRED",
        message: "Ask your company admin to invite you first, then register with your work email.",
      });
    }
    if (!employeeRecord.companyId) {
      return res.status(400).json({
        ok: false,
        message: "This invite is not linked to a company. Ask your admin to invite you again.",
      });
    }
    if (employeeIdIsAssigned(employeeRecord)) {
      return res.status(400).json({
        ok: false,
        code: "COMPLETE_REGISTRATION",
        employeeId: employeeRecord.id,
        message: `You already have Employee ID ${employeeRecord.id}. Complete registration using your ID and set a password below.`,
      });
    }

    await AuthUser.create({
      id: `usr_${Date.now().toString(36)}`,
      email: normalizedEmail,
      fullName: displayName,
      companyName: "—",
      companySize: "—",
      monthlySpend: "—",
      companyType: "—",
      passwordHash,
      createdAt,
      companyId: employeeRecord.companyId,
    });

    employeeRecord.name = displayName;
    if (department?.trim()) employeeRecord.department = department.trim();
    await employeeRecord.save();

    res.json({
      ok: true,
      pending: true,
      message:
        "Password saved. Your admin will assign your Employee ID. You can log in once you receive it (e.g. emp1).",
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, employeeId, portal } = req.body as {
      email?: string;
      password?: string;
      employeeId?: string;
      portal?: "admin" | "employee";
    };
    const loginPortal = portal === "employee" ? "employee" : "admin";

    let normalizedEmail = String(email || "").trim().toLowerCase();
    let employeeRecord: InstanceType<typeof Employee> | null = null;
    let user: InstanceType<typeof AuthUser> | null = null;

     if (loginPortal === "employee") {
      const rawId = String(employeeId || "").trim();

      // Preferred: work email (unique across companies; emp1 can collide).
      if (normalizedEmail) {
        user = await AuthUser.findOne({ email: normalizedEmail });
        employeeRecord = await findActiveEmployeeByEmail(
          normalizedEmail,
          user?.companyId || undefined
        );
        if (!employeeRecord) {
          employeeRecord = await findActiveEmployeeByEmail(normalizedEmail);
        }

        if (rawId && employeeRecord) {
          const idOk =
            String(employeeRecord.id).toLowerCase() === rawId.toLowerCase() ||
            (isSerialEmployeeId(employeeRecord.id) &&
              isSerialEmployeeId(rawId) &&
              normalizeSerialEmployeeId(employeeRecord.id) === normalizeSerialEmployeeId(rawId));
          if (!idOk) {
            return res.status(400).json({
              ok: false,
              message: `This email belongs to Employee ID ${employeeRecord.id}, not ${rawId}.`,
            });
          }
        }

        if (!employeeRecord) {
          return res.status(400).json({
            ok: false,
            message: "No employee found with that work email. Ask your admin to invite you first.",
          });
        }
        if (!employeeIdIsAssigned(employeeRecord)) {
          return res.status(403).json({
            ok: false,
            message: "Your Employee ID has not been assigned yet. Ask your admin to assign one.",
            code: "PENDING_ID",
          });
        }
        if (!user) {
          return res.status(400).json({
            ok: false,
            code: "NEED_PASSWORD_SETUP",
            employeeId: employeeRecord.id,
            employeeEmail: employeeRecord.email,
            message: `No password set yet. Go to Employee registration → "I have my Employee ID", enter ${employeeRecord.id}, your work email (${employeeRecord.email}), and choose a password.`,
          });
        }
      } else if (rawId) {
        // Legacy / demo: Employee ID only (ambiguous when multiple companies share emp1).
        const candidates = (await findEmployeesByLoginId(rawId)).filter((row) =>
          employeeIdIsAssigned(row)
        );
        if (!candidates.length) {
          const any = await findEmployeeByLoginId(rawId);
          if (any && !employeeIdIsAssigned(any)) {
            return res.status(403).json({
              ok: false,
              message: "Your Employee ID has not been assigned yet. Ask your admin to assign one.",
              code: "PENDING_ID",
            });
          }
          return res.status(400).json({ ok: false, message: "No employee found with that ID." });
        }
        if (candidates.length === 1) {
          employeeRecord = candidates[0]!;
          normalizedEmail = String(employeeRecord.email).trim().toLowerCase();
          user = await AuthUser.findOne({ email: normalizedEmail });
        } else {
          for (const candidate of candidates) {
            const emailCandidate = String(candidate.email || "").trim().toLowerCase();
            const auth = await AuthUser.findOne({ email: emailCandidate });
            if (!auth) continue;
            const ok = await bcrypt.compare(String(password || ""), auth.passwordHash);
            if (ok) {
              employeeRecord = candidate;
              user = auth;
              normalizedEmail = emailCandidate;
              break;
            }
          }
          if (!employeeRecord) {
            return res.status(400).json({
              ok: false,
              message:
                "Multiple companies use this Employee ID. Log in with your work email instead.",
            });
          }
        }
        if (!user) {
          return res.status(400).json({
            ok: false,
            code: "NEED_PASSWORD_SETUP",
            employeeId: employeeRecord!.id,
            employeeEmail: employeeRecord!.email,
            message: `No password set yet for ${employeeRecord!.id}. Go to Employee registration → "I have my Employee ID", enter ${employeeRecord!.id}, your work email (${employeeRecord!.email}), and choose a password.`,
          });
        }
      } else {
        return res.status(400).json({
          ok: false,
          message: "Work email is required. Log in with the email your admin invited.",
        });
      }
    } else {
      if (!normalizedEmail) {
        return res.status(400).json({ ok: false, message: "Email is required." });
      }
      user = await AuthUser.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ ok: false, message: "No account found." });
      }
    }

    const isMatch = await bcrypt.compare(String(password || ""), user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: "Incorrect password." });
    }

    let adminRecord = await AdminUser.findOne({ email: normalizedEmail, active: true });
    if (!employeeRecord) {
      employeeRecord = await Employee.findOne({ email: normalizedEmail, active: true });
    }

    // Backfill: company signup users (real companyName) who never got an AdminUser / company.
    if (
      loginPortal === "admin" &&
      !adminRecord &&
      user.companyName &&
      user.companyName !== "—" &&
      !employeeRecord
    ) {
      const companyId = await ensureAdminCompany(user, null);
      adminRecord = await AdminUser.create({
        id: `ADM-${Date.now().toString(36).toUpperCase()}`,
        name: String(user.fullName || normalizedEmail).trim() || normalizedEmail,
        email: normalizedEmail,
        role: "super_admin",
        active: true,
        twoFactor: false,
        canRead: true,
        canWrite: true,
        companyId,
      });
    }

    if (loginPortal === "admin") {
      if (!adminRecord) {
        return res.status(403).json({
          ok: false,
          message: "This account does not have admin access. Try logging in as Employee.",
          code: "NOT_ADMIN",
        });
      }
      const companyId = await ensureAdminCompany(user, adminRecord);
      adminRecord.companyId = companyId;
    } else if (!employeeRecord) {
      return res.status(403).json({
        ok: false,
        message: "This account is not linked to an employee profile. Ask HR to invite you.",
        code: "NOT_EMPLOYEE",
      });
    }

    const companyId =
      loginPortal === "admin"
        ? String(adminRecord?.companyId || user.companyId || "")
        : String(employeeRecord?.companyId || user.companyId || "");

    const token = jwt.sign(
      {
        id: user.id,
        email: normalizedEmail,
        portal: loginPortal,
        employeeId: employeeRecord?.id,
        adminId: adminRecord?.id,
        companyId: companyId || undefined,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userPayload = { ...user.toObject() } as Record<string, unknown>;
    delete userPayload.passwordHash;
    delete userPayload._id;
    delete userPayload.__v;
    userPayload["portal"] = loginPortal;
    if (companyId) userPayload["companyId"] = companyId;

    if (adminRecord) {
      userPayload["adminId"] = adminRecord.id;
      userPayload["adminRole"] = adminRecord.role;
    }
    if (employeeRecord) {
      userPayload["employeeId"] = employeeRecord.id;
      userPayload["employeeName"] = employeeRecord.name;
      userPayload["employeeDepartment"] = employeeRecord.department;
      userPayload["employeeRole"] = employeeRecord.role;
    }

    res.json({ ok: true, user: userPayload, token });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

// --- MOBILE (AllpayEmployeeApp) — onboarding + sync ---
registerMobileOnboardingRoutes(router);

router.post("/mobile/auth/employee-token", async (req, res) => {
  try {
    const { employeeId, inviteToken, companyId } = req.body as {
      employeeId?: string;
      inviteToken?: string;
      companyId?: string;
    };
    if (!employeeId?.trim() || !inviteToken?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "employeeId and inviteToken are required"
      });
    }
    const query: Record<string, unknown> = {
      id: String(employeeId).trim(),
      inviteToken: String(inviteToken).trim(),
      active: true,
    };
    if (companyId?.trim()) query.companyId = String(companyId).trim();
    const matches = await Employee.find(query).exec();
    if (matches.length === 0) {
      return res.status(401).json({ ok: false, message: "Invalid employeeId or inviteToken" });
    }
    if (matches.length > 1) {
      return res.status(409).json({
        ok: false,
        message: "Multiple companies match this employee id. Pass companyId or use invite-code login.",
        code: "AMBIGUOUS_EMPLOYEE",
      });
    }
    const emp = matches[0]!;
    const payload: { typ: string; employeeId: string; companyId?: string } = {
      typ: "employee",
      employeeId: emp.id,
    };
    if (emp.companyId) payload.companyId = emp.companyId;
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "60d" });
    res.json({
      ok: true,
      token,
      employeeId: emp.id,
      companyId: emp.companyId || null,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

async function resolveEmployeeForMobileSync(
  employeeId: string,
  overrides?: { employeeName?: string; department?: string; companyId?: string }
): Promise<{ name: string; department: string; companyId?: string } | null> {
  const companyId = overrides?.companyId?.trim();
  // Multi-company: never resolve emp1 without a company scope when ambiguous.
  const query: Record<string, unknown> = { id: employeeId, active: true };
  if (companyId) query.companyId = companyId;

  const matches = await Employee.find(query).exec();
  if (matches.length > 1 && !companyId) {
    return null;
  }
  const emp =
    matches.length === 1
      ? matches[0]
      : matches.find((row) => row.companyId === companyId) || null;
  if (emp) {
    return { name: emp.name, department: emp.department, companyId: emp.companyId };
  }
  if (matches.length > 1) {
    return null;
  }
  // Do not invent orphan employees without a company — that breaks tenant isolation.
  if (!companyId) return null;
  const name = overrides?.employeeName?.trim();
  if (name) {
    return {
      name,
      department: overrides?.department?.trim() || "Unassigned",
      companyId,
    };
  }
  return null;
}

router.post("/mobile/payments/create-order", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const body = req.body as {
      txId?: string;
      amount?: number;
      employeeId?: string;
      merchant?: {
        vpa?: string;
        name?: string;
        category?: string;
        mcc?: string;
        amount?: number;
      };
      upiApp?: string;
      employeeName?: string;
      department?: string;
    };

    const txId = body.txId?.trim();
    const employeeId = body.employeeId?.trim();
    if (!txId || !employeeId || !body.merchant?.vpa) {
      return res.status(400).json({
        ok: false,
        message: "txId, employeeId, and merchant.vpa are required"
      });
    }
    if (req.mobileEmployeeId && req.mobileEmployeeId !== employeeId) {
      return res.status(403).json({ ok: false, message: "employeeId does not match token" });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: "Valid amount is required" });
    }

    const syncOverrides: { employeeName?: string; department?: string; companyId?: string } = {};
    if (body.employeeName?.trim()) syncOverrides.employeeName = body.employeeName.trim();
    if (body.department?.trim()) syncOverrides.department = body.department.trim();
    if (req.mobileCompanyId) syncOverrides.companyId = req.mobileCompanyId;
    const resolved = await resolveEmployeeForMobileSync(employeeId, syncOverrides);
    if (!resolved) {
      return res.status(404).json({ ok: false, message: "Employee not found" });
    }

    const result = await createRazorpayOrder({
      txId,
      amount,
      employeeId,
      companyId: resolved.companyId || req.mobileCompanyId,
      employeeName: resolved.name,
      department: resolved.department,
      merchant: {
        vpa: body.merchant.vpa,
        name: body.merchant.name ?? "Unknown",
        category: body.merchant.category ?? "office",
        mcc: body.merchant.mcc ?? "",
        ...(body.merchant.amount != null ? { amount: body.merchant.amount } : {}),
      },
      ...(body.upiApp?.trim() ? { upiApp: body.upiApp.trim() } : {}),
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (error instanceof MerchantPayeeError || statusCode === 400) {
      return res.status(400).json({ ok: false, message: (error as Error).message });
    }
    if (statusCode === 409) {
      return res.status(409).json({ ok: false, message: (error as Error).message });
    }
    if ((error as Error).message.includes("Razorpay")) {
      return res.status(502).json({ ok: false, message: (error as Error).message });
    }
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/mobile/payments/confirm", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const body = req.body as {
      txId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      latitude?: number | null;
      longitude?: number | null;
      locationCapturedAt?: string | null;
      location?: unknown;
    };
    if (!body.txId || !body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return res.status(400).json({
        ok: false,
        message: "txId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required"
      });
    }

    const location = parsePaymentLocation(body);
    const existingQuery: Record<string, unknown> = { id: body.txId };
    if (req.mobileCompanyId) existingQuery.companyId = req.mobileCompanyId;
    const existing = await Transaction.findOne(existingQuery).exec();
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Transaction not found" });
    }
    if (req.mobileEmployeeId && req.mobileEmployeeId !== existing.employeeId) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }

    const tx = await confirmRazorpayPayment({
      txId: body.txId,
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_signature: body.razorpay_signature,
      location,
    });
    const shopPayoutEnabled = isShopPayoutEnabled();

    res.json({
      ok: true,
      paymentStatus: tx.paymentStatus,
      razorpayPaymentId: tx.razorpayPaymentId,
      razorpayOrderId: tx.razorpayOrderId ?? null,
      razorpayPayoutId: tx.razorpayPayoutId ?? null,
      payoutUtr: tx.payoutUtr ?? null,
      payoutFailedReason: tx.payoutFailedReason ?? null,
      shopPayoutEnabled,
      summary: explainPaymentStatus(tx.paymentStatus, shopPayoutEnabled),
      latitude: tx.latitude ?? null,
      longitude: tx.longitude ?? null,
      locationCapturedAt: tx.locationCapturedAt ?? null,
    });
  } catch (error) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/mobile/payments/checkout-opened", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const txId = (req.body as { txId?: string }).txId?.trim();
    if (!txId) {
      return res.status(400).json({ ok: false, message: "txId is required" });
    }
    const txQuery: Record<string, unknown> = { id: txId };
    if (req.mobileCompanyId) txQuery.companyId = req.mobileCompanyId;
    const tx = await Transaction.findOne(txQuery).exec();
    if (!tx) {
      return res.status(404).json({ ok: false, message: "Transaction not found" });
    }
    if (req.mobileEmployeeId && req.mobileEmployeeId !== tx.employeeId) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }
    await markCheckoutOpened(txId, req.mobileCompanyId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.get("/mobile/transactions/:id/payment-status", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const idParam = req.params["id"];
    const transactionId = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!transactionId) {
      return res.status(400).json({ ok: false, message: "Missing transaction id" });
    }
    const txQuery: Record<string, unknown> = { id: transactionId };
    if (req.mobileCompanyId) txQuery.companyId = req.mobileCompanyId;
    const tx = await Transaction.findOne(txQuery).exec();
    if (!tx) {
      return res.status(404).json({ ok: false, message: "Transaction not found" });
    }
    if (req.mobileEmployeeId && req.mobileEmployeeId !== tx.employeeId) {
      return res.status(403).json({ ok: false, message: "Not allowed" });
    }
    await syncCapturedOrderFromRazorpay(tx.id);
    await settleMerchantPayout(tx.id);
    const latest = (await Transaction.findOne(txQuery).exec()) ?? tx;
    const shopPayoutEnabled = isShopPayoutEnabled();
    res.json({
      ok: true,
      paymentStatus: latest.paymentStatus ?? "draft",
      razorpayPaymentId: latest.razorpayPaymentId ?? null,
      razorpayOrderId: latest.razorpayOrderId ?? null,
      razorpayPayoutId: latest.razorpayPayoutId ?? null,
      payoutUtr: latest.payoutUtr ?? null,
      payoutFailedReason: latest.payoutFailedReason ?? null,
      shopPayoutEnabled,
      summary: explainPaymentStatus(latest.paymentStatus, shopPayoutEnabled),
      expenseStatus: latest.status
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/mobile/transactions/sync", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const body = req.body as {
      transaction?: MobileTransactionPayload;
      employeeName?: string;
      department?: string;
    };
    const tx = body.transaction;
    if (!tx?.id || !tx.employeeId || !tx.merchant) {
      return res.status(400).json({
        ok: false,
        message: "transaction with id, employeeId, and merchant is required"
      });
    }
    if (req.mobileEmployeeId && req.mobileEmployeeId !== tx.employeeId) {
      return res.status(403).json({ ok: false, message: "Transaction employeeId does not match token" });
    }

    const syncOverrides: { employeeName?: string; department?: string; companyId?: string } = {};
    if (typeof body.employeeName === "string" && body.employeeName.trim()) {
      syncOverrides.employeeName = body.employeeName.trim();
    }
    if (typeof body.department === "string" && body.department.trim()) {
      syncOverrides.department = body.department.trim();
    }
    const bodyCompanyId =
      typeof (body as { companyId?: string }).companyId === "string"
        ? String((body as { companyId?: string }).companyId).trim()
        : "";
    if (req.mobileCompanyId) syncOverrides.companyId = req.mobileCompanyId;
    else if (bodyCompanyId) syncOverrides.companyId = bodyCompanyId;

    // If caller did not send companyId, resolve only when the employee id is unique globally.
    if (!syncOverrides.companyId) {
      const unique = await Employee.find({ id: tx.employeeId, active: true }).select({ companyId: 1 }).lean();
      if (unique.length === 1 && unique[0]?.companyId) {
        syncOverrides.companyId = String(unique[0].companyId);
      }
    }

    if (!syncOverrides.companyId) {
      return res.status(400).json({
        ok: false,
        message:
          "companyId is required when employee id exists in multiple companies (or use an employee JWT with companyId).",
      });
    }

    const resolved = await resolveEmployeeForMobileSync(tx.employeeId, syncOverrides);
    if (!resolved?.companyId) {
      return res.status(404).json({
        ok: false,
        message:
          "Employee not found in this company. Add them in the dashboard (invite/import) or pass employeeName, department, and companyId.",
      });
    }

    const fields = mobileTxToDashboardFields(tx, resolved.name, resolved.department);
    if (resolved.companyId) {
      (fields as Record<string, unknown>).companyId = resolved.companyId;
    }

    const policyCheck = await evaluateLiveTransaction({
      id: tx.id,
      amount: Number(fields.amount ?? tx.amount),
      dateTime: String(fields.dateTime ?? tx.timestamp ?? dayjs().toISOString()),
      category: String(fields.category ?? tx.merchant?.category ?? ""),
      employeeId: tx.employeeId,
      department: resolved.department,
      companyId: resolved.companyId,
    });
    if (policyCheck.policyWarning) {
      fields.policyWarning = policyCheck.policyWarning;
      if (!tx.warningAcknowledged) {
        fields.status = "flagged";
        const policyFlags = policyCheck.violations.map((v) => ({
          id: `pol-${v.policyId}-${Date.now().toString(36)}`,
          rule: v.policyName,
          reason: v.reasons.join("; "),
          details: v.reasons.join("; "),
        }));
        fields.flags = [...(Array.isArray(fields.flags) ? fields.flags : []), ...policyFlags];
      }
    }

    const syncEvent = {
      id: `mob-${Date.now().toString(36)}`,
      actor: "Employee app",
      action: "Synced from mobile",
      timestamp: dayjs().toISOString()
    };

    const existing = await Transaction.findOne({ id: tx.id }).exec();
    if (existing && (existing.status === "approved" || existing.status === "rejected")) {
      if (typeof fields.merchantVpa === "string") {
        existing.merchantVpa = fields.merchantVpa;
      }
      if (typeof fields.reimbursementNote === "string") {
        existing.reimbursementNote = fields.reimbursementNote;
      }
      if (typeof fields.policyWarning === "string") {
        existing.policyWarning = fields.policyWarning;
      }
      if (typeof fields.warningAcknowledged === "boolean") {
        existing.warningAcknowledged = fields.warningAcknowledged;
      }
      if (fields.mobileLocation !== undefined) {
        existing.mobileLocation = fields.mobileLocation;
      }
      if (fields.latitude !== undefined) {
        existing.latitude = fields.latitude as number | null;
      }
      if (fields.longitude !== undefined) {
        existing.longitude = fields.longitude as number | null;
      }
      if (fields.locationCapturedAt !== undefined) {
        existing.locationCapturedAt = fields.locationCapturedAt as string | null;
      }
      if (Array.isArray(fields.mobileReceipts)) {
        existing.mobileReceipts = fields.mobileReceipts;
      }
      if (typeof fields.lastSyncedFromMobileAt === "string") {
        existing.lastSyncedFromMobileAt = fields.lastSyncedFromMobileAt;
      }
      existing.timeline.push(syncEvent);
      await existing.save();
      return res.json({ ok: true, backendId: existing.id });
    }

    if (existing) {
      const merged = mergeMobileSyncFields(existing, fields);
      Object.assign(existing, merged);
      existing.timeline.push(syncEvent);
      await existing.save();
      return res.json({
        ok: true,
        backendId: existing.id,
        paymentStatus: existing.paymentStatus,
        razorpayPaymentId: existing.razorpayPaymentId ?? null
      });
    }

    const created = new Transaction({
      ...fields,
      timeline: [syncEvent]
    });
    await created.save();
    res.json({
      ok: true,
      backendId: created.id,
      paymentStatus: created.paymentStatus,
      razorpayPaymentId: created.razorpayPaymentId ?? null
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.patch("/mobile/transactions/:id", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const idParam = req.params["id"];
    const transactionId = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!transactionId) {
      return res.status(400).json({ ok: false, message: "Missing transaction id" });
    }

    const body = req.body as {
      employeeId?: string;
      status?: string;
      reimbursementPurpose?: string;
      reimbursementNote?: string;
      receipts?: MobileTransactionPayload["receipts"];
      location?: MobileTransactionPayload["location"];
      employeeName?: string;
      department?: string;
    };

    if (req.mobileEmployeeId && body.employeeId && req.mobileEmployeeId !== body.employeeId) {
      return res.status(403).json({ ok: false, message: "employeeId does not match token" });
    }

    const txQuery: Record<string, unknown> = { id: transactionId };
    if (req.mobileCompanyId) txQuery.companyId = req.mobileCompanyId;
    const tx = await Transaction.findOne(txQuery).exec();
    if (!tx) {
      return res.status(404).json({ ok: false, message: "Transaction not found" });
    }

    if (req.mobileEmployeeId && tx.employeeId !== req.mobileEmployeeId) {
      return res.status(403).json({ ok: false, message: "Not allowed to update this transaction" });
    }

    const empStillQuery: Record<string, unknown> = { id: tx.employeeId, active: true };
    if (tx.companyId || req.mobileCompanyId) {
      empStillQuery.companyId = tx.companyId || req.mobileCompanyId;
    }
    const empStill = await Employee.findOne(empStillQuery).exec();
    if (!empStill) {
      return res.status(404).json({ ok: false, message: "Employee context missing" });
    }

    if (body.status) {
      if (
        body.status === "Pending Approval" &&
        !canSubmitReimbursement(tx.paymentStatus as PaymentStatus | undefined)
      ) {
        return res.status(409).json({
          ok: false,
          message: reimbursementBlockedMessage(tx.paymentStatus as PaymentStatus | undefined)
        });
      }
      tx.status = mapMobileStatusToDashboard(body.status);
    }
    if (body.reimbursementPurpose?.trim()) {
      tx.purposeCategory = body.reimbursementPurpose.trim();
    }
    if (body.reimbursementNote !== undefined) {
      tx.reimbursementNote = body.reimbursementNote;
    }
    if (body.receipts) {
      tx.mobileReceipts = body.receipts;
    }
    if (body.location !== undefined) {
      const locFields = locationFieldsFromMobile(body.location ?? null);
      tx.mobileLocation = locFields.mobileLocation;
      tx.latitude = locFields.latitude;
      tx.longitude = locFields.longitude;
      tx.locationCapturedAt = locFields.locationCapturedAt;
    } else {
      const fromBody = parsePaymentLocation(body);
      if (fromBody) {
        applyLocationToRecord(tx, fromBody);
      }
    }

    tx.lastSyncedFromMobileAt = dayjs().toISOString();
    tx.timeline.push({
      id: `mob-${Date.now().toString(36)}`,
      actor: "Employee app",
      action: "Updated from mobile (patch)",
      timestamp: dayjs().toISOString()
    });
    await tx.save();
    res.json({ ok: true, backendId: tx.id });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

// --- ADMIN (JWT + active AdminUser record) ---
router.use("/admin", authMiddleware, requireAdminUser);

router.get("/admin/bootstrap", async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const [txBlock, employees, policies, alertsConfigArr, admins, billingArr, exportAudits, company] =
      await Promise.all([
        listTransactionsFromQuery(req.query as Record<string, string | string[] | undefined>, {
          bootstrapDefaultLimit: getDefaultBootstrapTxLimit(),
          companyId,
        }),
        Employee.find({ companyId }).exec(),
        ExpensePolicy.find({ companyId }).exec(),
        AlertConfig.find({ companyId }).exec(),
        AdminUser.find({ companyId }).exec(),
        BillingPlan.find({ companyId }).exec(),
        ExportAudit.find({ companyId }).sort({ exportedAt: -1 }).exec(),
        Company.findOne({ id: companyId }).lean(),
      ]);

    res.json({
      ...txBlock,
      employees,
      policies,
      alertsConfig:
        alertsConfigArr[0] || {
          delivery: "both",
          threshold: "daily_digest",
          mutedPolicies: [],
          mutedEmployees: [],
          companyId,
        },
      admins,
      billing:
        billingArr[0] || {
          plan: "Basic",
          billingCycle: "monthly",
          nextRenewal: dayjs().add(1, "month").format("YYYY-MM-DD"),
          licenses: 0,
          headcount: 0,
          companyId,
        },
      exportAudits,
      companyId,
      company: company
        ? {
            id: company.id,
            name: company.name,
            invitePrefix: company.invitePrefix || null,
          }
        : { id: companyId, name: null, invitePrefix: null },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/admin/company", async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const company = await Company.findOne({ id: companyId }).lean();
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json({
      ok: true,
      company: {
        id: company.id,
        name: company.name,
        invitePrefix: company.invitePrefix || null,
        companySize: company.companySize || null,
        companyType: company.companyType || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch("/admin/company", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const company = await Company.findOne({ id: companyId }).exec();
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const body = req.body as { name?: string; invitePrefix?: string };
    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) return res.status(400).json({ error: "Company name cannot be empty" });
      company.name = name;
    }
    if (body.invitePrefix != null) {
      const normalized = normalizeInvitePrefix(body.invitePrefix);
      if (normalized.length < 2 || normalized.length > 6) {
        return res.status(400).json({
          error: "Invite prefix must be 2–6 letters or numbers (e.g. MCR)",
        });
      }
      const unique = await ensureUniqueInvitePrefix(normalized, companyId, company.name);
      if (unique !== normalized) {
        return res.status(409).json({
          error: `Invite prefix ${normalized} is already taken. Try ${unique} (3 letters first, then 4 from company name — never reuse an existing prefix).`,
          suggestedPrefix: unique,
        });
      }
      company.invitePrefix = normalized;
    }

    await company.save();

    let regenerated = 0;
    if (body.invitePrefix != null && company.invitePrefix) {
      const { buildInviteCode, normalizeInviteCode } = await import("./utils/inviteCode");
      const employees = await Employee.find({
        companyId,
        id: { $not: /^PEND-/i },
        idAssigned: true,
      }).exec();
      for (const emp of employees) {
        const desired = buildInviteCode(company.invitePrefix, emp.id);
        if (normalizeInviteCode(emp.inviteCode || "") === desired) continue;
        emp.inviteCode = desired;
        await emp.save();
        regenerated += 1;
      }
    }

    res.json({
      ok: true,
      company: {
        id: company.id,
        name: company.name,
        invitePrefix: company.invitePrefix || null,
      },
      regeneratedInviteCodes: regenerated,
      message: company.invitePrefix
        ? `Invite codes will look like ${company.invitePrefix}_EMPLOYEEID.${regenerated ? ` Updated ${regenerated} employee code(s).` : ""}`
        : "Company updated.",
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/admin/transactions", async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const { transactions, transactionPage, transactionPageSize, transactionTotal, hasMoreTransactions } =
      await listTransactionsFromQuery(
        { ...req.query } as Record<string, string | string[] | undefined>,
        { companyId }
      );
    res.json({ transactions, transactionPage, transactionPageSize, transactionTotal, hasMoreTransactions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Admin: fetch a single payment/expense with GPS snapshot fields.
 * `:id` may be a transaction id OR a UPI/Razorpay paymentId.
 */
router.get("/admin/payments/:id", async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing payment id" });
    }

    let tx = await Transaction.findOne({ id, companyId }).exec();
    if (!tx) {
      tx = await Transaction.findOne({ paymentId: id, companyId }).exec();
    }
    if (!tx) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const formatted = formatTransactionDoc(tx);
    res.json({
      ok: true,
      payment: formatted,
      transaction: formatted,
      latitude: tx.latitude ?? null,
      longitude: tx.longitude ?? null,
      locationCapturedAt: tx.locationCapturedAt ?? null,
      location_captured_at: tx.locationCapturedAt ?? null,
      mobileLocation: tx.mobileLocation ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** Admin: fetch a single transaction by expense id (includes location snapshot). */
router.get("/admin/transactions/:id", async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing transaction id" });
    }

    const tx = await Transaction.findOne({ id, companyId }).exec();
    if (!tx) {
      return res.status(404).json({ error: "Not found" });
    }

    const formatted = formatTransactionDoc(tx);
    res.json({
      ok: true,
      transaction: formatted,
      latitude: tx.latitude ?? null,
      longitude: tx.longitude ?? null,
      locationCapturedAt: tx.locationCapturedAt ?? null,
      location_captured_at: tx.locationCapturedAt ?? null,
      mobileLocation: tx.mobileLocation ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** ADM-001: one-day spend totals and category mix */
router.get("/admin/analytics/daily-spend", R_ANAL, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const d = req.query["date"];
    const dateStr = Array.isArray(d) ? d[0] : d;
    const data = await getDailySpend(typeof dateStr === "string" ? dateStr : undefined, companyId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** ADM-006: KPIs, category / employee / timeline breakdowns */
router.get("/admin/analytics/aggregated", R_ANAL, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const start = req.query["startDate"];
    const end = req.query["endDate"];
    const b = req.query["timelineBucket"];
    const startDate = (Array.isArray(start) ? start[0] : start) as string | undefined;
    const endDate = (Array.isArray(end) ? end[0] : end) as string | undefined;
    const raw = (Array.isArray(b) ? b[0] : b) as string | undefined;
    const bucket: TimelineBucket =
      raw === "weekly" || raw === "monthly" ? raw : "daily";
    const data = await getAggregated(startDate, endDate, bucket, companyId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/** ADM-003: simulate a policy over stored transactions (policy effective dates apply in-engine) */
router.post("/admin/policies/preview", R_FIN, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const policy = req.body as PolicyPreviewBody;
    if (!policy || typeof policy !== "object") {
      return res.status(400).json({ error: "Policy body required" });
    }
    if (!policy.id && !policy.name) {
      return res.status(400).json({ error: "Policy id or name is required" });
    }
    const txs = await Transaction.find({ companyId }).lean();
    const preview = runPolicyPreview(txs, policy);
    res.json({ ok: true, ...preview });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/transactions/approve", R_FIN, async (req, res) => {
  const { transactionId, amount } = req.body;
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const tx = await Transaction.findOne({ id: transactionId, companyId });
    if (!tx) return res.status(404).json({ error: "Not found" });

    const actor = req.adminUser?.name || "Admin";
    tx.status = "approved";
    tx.claimedAmount = amount;
    tx.adminDecision = amount === tx.amount ? "Approved in full" : `Partial approval Rs.${amount}`;
    tx.adminDecisionAt = dayjs().toISOString();
    const approvedTicket = closeClaimTicket(tx.claimTicket as ClaimTicket | undefined, "approved", actor);
    if (approvedTicket) {
      tx.claimTicket = approvedTicket;
      tx.claimTicketStatus = approvedTicket.status;
    }
    tx.timeline.push(
      { id: `${tx.id}-review`, actor, action: "Admin reviewed", timestamp: dayjs().toISOString() },
      { id: `${tx.id}-approve`, actor, action: `Approved Rs.${amount}`, timestamp: dayjs().toISOString() }
    );
    await tx.save();
    await syncPaymentProofStatus(tx.id, "approved");
    bustCompanyReadCaches(companyId);
    res.json({ ok: true, transactionId, amount, processedAt: dayjs().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/transactions/reject", R_FIN, async (req, res) => {
  const { transactionId, reason } = req.body;
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const tx = await Transaction.findOne({ id: transactionId, companyId });
    if (!tx) return res.status(404).json({ error: "Not found" });

    const actor = req.adminUser?.name || "Admin";
    tx.status = "rejected";
    tx.adminDecision = `Rejected - ${reason}`;
    tx.adminDecisionAt = dayjs().toISOString();
    const rejectedTicket = closeClaimTicket(tx.claimTicket as ClaimTicket | undefined, "rejected", actor);
    if (rejectedTicket) {
      tx.claimTicket = rejectedTicket;
      tx.claimTicketStatus = rejectedTicket.status;
    }
    tx.timeline.push(
      { id: `${tx.id}-review`, actor, action: "Admin reviewed", timestamp: dayjs().toISOString() },
      { id: `${tx.id}-reject`, actor, action: `Rejected (${reason})`, timestamp: dayjs().toISOString() }
    );
    await tx.save();
    await syncPaymentProofStatus(tx.id, "rejected");
    bustCompanyReadCaches(companyId);
    res.json({ ok: true, transactionId, reason, processedAt: dayjs().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/transactions/bulk", R_FIN, async (req, res) => {
  const { ids, decision, reason } = req.body;
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const txs = await Transaction.find({ id: { $in: ids }, companyId });
    const actor = req.adminUser?.name || "Admin";
    for (const tx of txs) {
      if (decision === "approved") {
        tx.status = "approved";
        tx.adminDecision = "Bulk approved";
      } else {
        tx.status = "rejected";
        tx.adminDecision = `Bulk rejected - ${reason || "Policy violation"}`;
      }
      tx.adminDecisionAt = dayjs().toISOString();
      tx.timeline.push({
        id: `${tx.id}-bulk`,
        actor,
        action: `Bulk ${decision}`,
        timestamp: dayjs().toISOString()
      });
    }
    await Promise.all(
      txs.map(async (tx) => {
        await tx.save();
        await syncPaymentProofStatus(
          tx.id,
          decision === "approved" ? "approved" : "rejected"
        );
      })
    );
    bustCompanyReadCaches(companyId);
    res.json({ ok: true, ids, decision, reason, processedAt: dayjs().toISOString() });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post(
  "/admin/transactions/:id/receipt",
  R_FIN,
  upload.single("receipt"),
  async (req, res) => {
    try {
      const companyId = requireCompanyId(req, res);
      if (!companyId) return;
      const rawId = req.params["id"];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Missing transaction id" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const tx = await Transaction.findOne({ id, companyId });
      if (!tx) {
        return res.status(404).json({ error: "Not found" });
      }
      const receiptUrl = await uploadFile(
        req.file.buffer,
        id,
        req.file.mimetype,
        req.file.originalname
      );
      let fraudAnalysis: Awaited<ReturnType<typeof analyzeReceiptFraud>> | undefined;
      try {
        fraudAnalysis = await analyzeReceiptFraud(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          { claimedAmount: tx.claimedAmount }
        );
      } catch (fraudErr) {
        console.error("Receipt fraud pipeline failed (admin receipt upload):", fraudErr);
      }
      tx.receiptUrl = receiptUrl;
      if (fraudAnalysis) {
        tx.receiptFraudScore = fraudAnalysis.fraudScore;
        tx.receiptFraudTier = fraudAnalysis.tier;
        tx.receiptFraudReport = fraudAnalysis;
        if (fraudAnalysis.tier !== "safe") {
          const newFlags = buildReceiptFraudFlags(tx.id, fraudAnalysis);
          const existing = Array.isArray(tx.flags) ? tx.flags : [];
          tx.flags = [...existing.filter((f) => f.id !== newFlags[0]?.id), ...newFlags];
          tx.status = "flagged";
        }
      }
      await tx.save();
      res.json({
        ok: true,
        transactionId: id,
        receiptUrl,
        receiptFraudScore: tx.receiptFraudScore,
        receiptFraudTier: tx.receiptFraudTier,
        transaction: formatTransactionDoc(tx),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

router.post("/admin/policies", R_FIN, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const body = req.body as PolicyPreviewBody;
    if (!body?.name?.trim()) {
      return res.status(400).json({ error: "Policy name is required" });
    }
    if (body.scopeType !== "all" && !body.scopeValue?.trim()) {
      return res.status(400).json({ error: "Scope value is required for department or employee scope" });
    }
    const id = body.id?.trim() || (await nextPolicyIdFromDb(companyId));
    const existing = await ExpensePolicy.findOne({ id, companyId }).exec();
    if (existing) {
      return res.status(409).json({ error: `Policy id ${id} already exists` });
    }
    const policy = new ExpensePolicy({
      ...body,
      id,
      name: body.name.trim(),
      active: body.active !== false,
      companyId,
    });
    await policy.save();
    res.json({ ok: true, policy });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete("/admin/policies/:id", R_FIN, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ error: "Policy id is required" });
    }
    const deleted = await ExpensePolicy.findOneAndDelete({ id, companyId }).exec();
    if (!deleted) {
      return res.status(404).json({ error: "Policy not found" });
    }
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/mobile/policies", mobileDeviceAuth, async (req: MobileRequest, res) => {
  try {
    const employeeId = req.mobileEmployeeId;
    const companyIdFromToken = req.mobileCompanyId;
    const empQuery: Record<string, unknown> = { id: employeeId, active: true };
    if (companyIdFromToken) empQuery.companyId = companyIdFromToken;
    const employee =
      employeeId != null ? await Employee.findOne(empQuery).lean().exec() : null;
    const companyId = companyIdFromToken || employee?.companyId;
    const policyQuery: Record<string, unknown> = { active: { $ne: false } };
    if (companyId) policyQuery.companyId = companyId;

    const policies = await ExpensePolicy.find(policyQuery)
      .select({
        id: 1,
        name: 1,
        mccCategory: 1,
        maxPerTransaction: 1,
        maxPerMonth: 1,
        allowedDays: 1,
        scopeType: 1,
        scopeValue: 1,
        startDate: 1,
        endDate: 1,
        active: 1,
      })
      .lean()
      .exec();

    const scoped = policies.filter((p) => {
      if (p.scopeType === "all") return true;
      if (p.scopeType === "employee" && employeeId) {
        return p.scopeValue === employeeId;
      }
      if (p.scopeType === "department" && employee?.department) {
        return p.scopeValue === employee.department;
      }
      return p.scopeType === "all";
    });

    res.json({ ok: true, policies: scoped });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
});

router.post("/admin/employees/import", R_HR, async (req, res) => {
  const companyId = requireCompanyId(req, res);
  if (!companyId) return;
  const { csvText } = req.body as { csvText?: string };
  if (csvText == null || String(csvText).trim() === "") {
    return res.status(400).json({ error: "csvText required" });
  }
  const lines = String(csvText).trim().split(/\n/);
  if (lines.length < 2) {
    return res.json({ ok: true, created: [], skipped: 0, errors: ["No data rows"] });
  }
  const header = lines[0]!.split(",").map((c) => c.trim().toLowerCase());
  const idx = (h: string) => header.indexOf(h);
  const I = {
    id: idx("id"),
    name: idx("name"),
    email: idx("email"),
    department: idx("department"),
    role: idx("role")
  };
  if (I.email < 0) {
    return res.status(400).json({ error: "CSV must include an email column" });
  }
  const created: object[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const parsedRows: Array<{
    rowNum: number;
    email: string;
    hasExplicitId: boolean;
    id: string;
    name: string;
    department: string;
    roleRec: "employee" | "manager";
    idAssigned: boolean;
  }> = [];

  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r]!.split(",").map((c) => c.trim());
    const email = I.email >= 0 ? cells[I.email] : "";
    if (!email) {
      errors.push(`Row ${r + 1}: missing email`);
      continue;
    }
    const hasExplicitId = I.id >= 0 && Boolean(cells[I.id!]);
    parsedRows.push({
      rowNum: r + 1,
      email: email.toLowerCase(),
      hasExplicitId,
      id: hasExplicitId ? cells[I.id!]! : makePendingEmployeeId(),
      name: I.name >= 0 && cells[I.name!] ? cells[I.name!]! : email.split("@")[0]! || "User",
      department: I.department >= 0 && cells[I.department!] ? cells[I.department!]! : "Unassigned",
      roleRec:
        I.role >= 0 && cells[I.role!] ? (cells[I.role!]! === "manager" ? "manager" : "employee") : "employee",
      idAssigned: hasExplicitId,
    });
  }

  const existingEmails = new Set(
    (
      await Employee.find({ companyId, email: { $in: parsedRows.map((row) => row.email) } })
        .select("email")
        .lean()
    ).map((row) => String(row.email))
  );

  for (const row of parsedRows) {
    if (existingEmails.has(row.email)) {
      skipped += 1;
      continue;
    }
    try {
      const emp = await Employee.create({
        id: row.idAssigned && isSerialEmployeeId(row.id) ? normalizeSerialEmployeeId(row.id) : row.id,
        name: row.name,
        email: row.email,
        department: row.department,
        role: row.roleRec,
        active: true,
        onboarded: row.idAssigned,
        idAssigned: row.idAssigned,
        travelApproved: false,
        companyId,
      });
      if (row.idAssigned) {
        await ensureEmployeeInviteCode(emp);
      }
      existingEmails.add(row.email);
      const o = emp.toObject() as unknown as Record<string, unknown>;
      delete o._id;
      delete o.__v;
      created.push(o);
    } catch (e) {
      errors.push(`Row ${row.rowNum}: ${(e as Error).message}`);
    }
  }
  res.json({ ok: true, created, skipped, errors, createdCount: created.length });
});

router.post("/admin/employees/invite", R_HR, async (req, res) => {
  const companyId = requireCompanyId(req, res);
  if (!companyId) return;
  const { email, department, name: nameIn, employeeId: employeeIdIn } = req.body as {
    email?: string;
    department?: string;
    name?: string;
    /** Optional HR/employee id; when set, invite code PREFIX_ID is created immediately. */
    employeeId?: string;
  };
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: "email required" });
  }
  const em = String(email).trim().toLowerCase();
  if (await Employee.findOne({ email: em, companyId })) {
    return res.status(400).json({ error: "Employee with this email already exists" });
  }
  // Work email is the unique web login key — block reuse across companies.
  const emailElsewhere = await Employee.findOne({
    email: em,
    companyId: { $ne: companyId },
  })
    .select({ id: 1, companyId: 1 })
    .lean();
  if (emailElsewhere) {
    return res.status(400).json({
      error: "This work email is already invited in another company. Use a different work email.",
      code: "EMAIL_IN_OTHER_COMPANY",
    });
  }
  const authElsewhere = await AuthUser.findOne({ email: em }).select({ companyId: 1 }).lean();
  if (authElsewhere?.companyId && authElsewhere.companyId !== companyId) {
    return res.status(400).json({
      error: "This work email already has a login for another company.",
      code: "EMAIL_AUTH_OTHER_COMPANY",
    });
  }
  const name = (nameIn && String(nameIn).trim()) || em.split("@")[0] || "User";
  const departmentVal = (department && String(department).trim()) || "Unassigned";
  const inviteToken = randomBytes(24).toString("hex");

  const requestedId = String(employeeIdIn || "").trim();
  let id = makePendingEmployeeId();
  let idAssigned = false;
  let inviteCode: string | undefined;

  if (requestedId) {
    const normalizedId = isSerialEmployeeId(requestedId)
      ? normalizeSerialEmployeeId(requestedId)
      : requestedId;
    if (await Employee.findOne({ id: normalizedId, companyId }).select("_id").lean()) {
      return res.status(400).json({ error: `Employee id ${normalizedId} is already used in this company` });
    }
    id = normalizedId;
    idAssigned = true;
  }

  const emp = await Employee.create({
    id,
    name,
    email: em,
    department: departmentVal,
    role: "employee",
    active: true,
    onboarded: idAssigned,
    idAssigned,
    travelApproved: false,
    inviteToken,
    companyId,
  });

  if (idAssigned) {
    inviteCode = await ensureEmployeeInviteCode(emp);
  }

  res.json({
    ok: true,
    employee: formatEmployeeDoc(emp),
    inviteCode: inviteCode || null,
    message: inviteCode
      ? `Employee invited. Share invite code ${inviteCode} for the mobile app.`
      : "Employee invited. Assign an Employee ID to generate a mobile invite code (PREFIX_EMPLOYEEID).",
  });
});

router.get("/admin/employees", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;

    const q = req.query as Record<string, string | string[] | undefined>;
    const one = (key: string) => {
      const v = q[key];
      return (Array.isArray(v) ? v[0] : v) as string | undefined;
    };

    const pageRaw = parseInt(String(one("page") || "1"), 10);
    const limitRaw = parseInt(String(one("limit") || "25"), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 25));
    const skip = (page - 1) * limit;

    const search = String(one("search") || one("q") || "").trim();
    const department = String(one("department") || "").trim();
    const status = String(one("status") || "all").trim().toLowerCase();

    const filter: Record<string, unknown> = { companyId };

    if (department) filter.department = department;

    if (status === "active") filter.active = true;
    else if (status === "inactive") filter.active = false;
    else if (status === "pending") {
      filter.active = true;
      filter.idAssigned = false;
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: rx },
        { email: rx },
        { id: rx },
        { department: rx },
        { inviteCode: rx },
      ];
    }

    const [total, rows, deptRows, countFacet] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter).sort({ name: 1, email: 1 }).skip(skip).limit(limit).lean().exec(),
      Employee.distinct("department", { companyId }),
      Employee.aggregate([
        { $match: { companyId } },
        {
          $facet: {
            total: [{ $count: "n" }],
            active: [{ $match: { active: true } }, { $count: "n" }],
            pendingId: [{ $match: { active: true, idAssigned: false } }, { $count: "n" }],
            onboarded: [{ $match: { onboarded: true } }, { $count: "n" }],
          },
        },
      ]),
    ]);

    const facet = countFacet[0] as
      | {
          total: { n: number }[];
          active: { n: number }[];
          pendingId: { n: number }[];
          onboarded: { n: number }[];
        }
      | undefined;
    const pick = (arr?: { n: number }[]) => arr?.[0]?.n ?? 0;

    const departments = (deptRows as string[])
      .map((d) => String(d || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    // Keep Mobile invite column in sync with PREFIX_EMPLOYEEID (heals legacy codes).
    let invitePrefix = "";
    try {
      invitePrefix = await getCompanyInvitePrefix(companyId);
    } catch {
      invitePrefix = "";
    }
    const employees = [];
    for (const emp of rows) {
      const o = { ...(emp as Record<string, unknown>) };
      delete o._id;
      delete o.__v;
      const empId = String(o.id || "");
      if (invitePrefix && empId && !/^PEND-/i.test(empId)) {
        try {
          const desired = buildInviteCode(invitePrefix, empId);
          if (normalizeInviteCode(String(o.inviteCode || "")) !== desired) {
            await Employee.updateOne({ companyId, id: empId }, { $set: { inviteCode: desired } });
            o.inviteCode = desired;
          }
        } catch {
          // leave stored inviteCode as-is
        }
      }
      employees.push(o);
    }

    res.json({
      ok: true,
      employees,
      page,
      pageSize: limit,
      total,
      hasMore: skip + rows.length < total,
      departments,
      counts: {
        total: pick(facet?.total),
        active: pick(facet?.active),
        pendingId: pick(facet?.pendingId),
        onboarded: pick(facet?.onboarded),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/admin/employees/pending-id", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const rows = await Employee.find({ companyId, active: true, idAssigned: false }).sort({ name: 1 }).exec();
    res.json({ ok: true, employees: rows.map((emp) => formatEmployeeDoc(emp)) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/employees/assign-id", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const { email, employeeId: employeeIdIn } = req.body as {
      email?: string;
      /** Optional custom HR id (e.g. 58847). Defaults to next empN serial. */
      employeeId?: string;
    };
    const em = String(email || "").trim().toLowerCase();
    if (!em) {
      return res.status(400).json({ error: "email is required" });
    }
    const emp = await Employee.findOne({ email: em, active: true, companyId });
    if (!emp) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (employeeIdIsAssigned(emp)) {
      return res.status(400).json({ error: "Employee already has an assigned ID", employeeId: emp.id });
    }

    const requestedId = String(employeeIdIn || "").trim();
    let newId: string;
    if (requestedId) {
      newId = isSerialEmployeeId(requestedId)
        ? normalizeSerialEmployeeId(requestedId)
        : requestedId;
      if (await Employee.findOne({ id: newId, companyId }).select("_id").lean()) {
        return res.status(400).json({ error: `Employee id ${newId} is already used in this company` });
      }
    } else {
      newId = await getNextEmployeeSerialId(companyId);
    }

    emp.id = newId;
    emp.idAssigned = true;
    emp.onboarded = true;
    if (!emp.inviteToken) {
      emp.inviteToken = randomBytes(24).toString("hex");
    }
    const inviteCode = await ensureEmployeeInviteCode(emp);
    await emp.save();

    res.json({
      ok: true,
      employeeId: newId,
      inviteCode,
      message: `Assigned ${newId}. Share invite code ${inviteCode} for the mobile app, or use web registration with Employee ID ${newId}.`,
      employee: formatEmployeeDoc(emp),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/employees/reset-login", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const { email, employeeId } = req.body as { email?: string; employeeId?: string };
    let emp = null;
    if (employeeId?.trim()) {
      emp = await findEmployeeByLoginId(employeeId, companyId);
    }
    if (!emp && email?.trim()) {
      emp = await findActiveEmployeeByEmail(email, companyId);
    }
    if (!emp) {
      return res.status(400).json({ error: "email or employeeId is required" });
    }
    if (!employeeIdIsAssigned(emp)) {
      return res.status(400).json({ error: "Assign an Employee ID before resetting login" });
    }
    const authEmail = String(emp.email).trim().toLowerCase();
    const deleted = await AuthUser.deleteOne({ email: authEmail });
    res.json({
      ok: true,
      employeeId: emp.id,
      hadLogin: deleted.deletedCount > 0,
      message: deleted.deletedCount
        ? `Login cleared for ${emp.id}. Employee can set a new password under Register → "I have my Employee ID".`
        : `No login existed for ${emp.id}. Employee should use Register → "I have my Employee ID" to set a password.`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/employees/generate-invite-code", R_HR, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const { email } = req.body as { email?: string };
    const em = String(email || "").trim().toLowerCase();
    if (!em) {
      return res.status(400).json({ error: "email is required" });
    }
    const emp = await Employee.findOne({ email: em, active: true, companyId });
    if (!emp) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (!employeeIdIsAssigned(emp)) {
      return res.status(400).json({
        error: "Assign an Employee ID before generating an invite code",
        code: "ID_REQUIRED",
      });
    }
    emp.inviteCode = await generateUniqueInviteCode(companyId, emp.id);
    if (!emp.inviteToken) {
      emp.inviteToken = randomBytes(24).toString("hex");
    }
    await emp.save();
    res.json({
      ok: true,
      inviteCode: emp.inviteCode,
      employee: formatEmployeeDoc(emp),
      message: `Invite code ${emp.inviteCode} ready for the mobile app.`,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch("/admin/alerts", R_FIN, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    let alert = await AlertConfig.findOne({ companyId });
    if (!alert) alert = new AlertConfig({ companyId });
    Object.assign(alert, req.body, { companyId });
    await alert.save();
    res.json({ ok: true, config: alert });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch("/admin/billing", R_BILL, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    let bill = await BillingPlan.findOne({ companyId });
    if (!bill) bill = new BillingPlan({ companyId });
    Object.assign(bill, req.body, { companyId });
    await bill.save();
    res.json({ ok: true, plan: bill.plan });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put("/admin/users", R_ADM, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const body = req.body as { id?: string; role?: string; active?: boolean };
    if (body.id && (body.active === false || (body.role && body.role !== "super_admin"))) {
      const blocked = await assertNotLastSuperAdmin(String(body.id), companyId);
      if (blocked) return res.status(409).json({ error: blocked, code: "LAST_SUPER_ADMIN" });
    }
    const role = isAdminRole(body.role) ? body.role : "finance_manager";
    const permissions = resolvePermissions(role, req.body);
    const admin = await AdminUser.findOneAndUpdate(
      { id: req.body.id, companyId },
      { ...req.body, ...permissions, companyId },
      {
        upsert: true,
        new: true
      }
    );
    res.json({ ok: true, admin });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/users/:id/toggle", R_ADM, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const rawId = req.params["id"];
    const paramId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!paramId) {
      return res.status(400).json({ error: "Missing id" });
    }
    const admin = await AdminUser.findOne({ id: String(paramId), companyId });
    if (admin) {
      if (admin.active) {
        const blocked = await assertNotLastSuperAdmin(String(paramId), companyId);
        if (blocked) return res.status(409).json({ error: blocked, code: "LAST_SUPER_ADMIN" });
      }
      admin.active = !admin.active;
      await admin.save();
    }
    res.json({ ok: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/admin/exports", R_EX, async (req, res) => {
  try {
    const companyId = requireCompanyId(req, res);
    if (!companyId) return;
    const payload = req.body;
    const actor = req.adminUser?.name || "Admin";
    const exp = new ExportAudit({
      id: `EXP-${Date.now()}`,
      actor,
      ...payload,
      companyId,
      exportedAt: dayjs().toISOString()
    });
    await exp.save();
    res.json({ ok: true, payload });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

registerAdminConsoleRoutes(router, R_ADM);
registerVerificationRoutes(router, R_FIN);
registerEmployeeRoutes(router, authMiddleware, upload);

export default router;
