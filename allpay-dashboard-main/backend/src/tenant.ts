import dayjs from "dayjs";
import {
  AlertConfig,
  BillingPlan,
  Company,
  type IAdminUser,
  type IAuthUser,
} from "./models";

export const DEMO_COMPANY_ID = "COMP-DEMO";
export const DEMO_COMPANY_NAME = "AllPay Demo";
export const DEMO_INVITE_PREFIX = "DEM";

export function newCompanyId(): string {
  return `COMP-${Date.now().toString(36).toUpperCase()}`;
}

/** Normalize to 2–6 alphanumeric chars for invite prefixes (e.g. MCR). */
export function normalizeInvitePrefix(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

/**
 * Preferred short prefix from a company display name.
 * Multi-word → up to 3 initials (e.g. "Acme Corp" → AC).
 * Single word → first 3 letters (e.g. "Microsoft" → MIC).
 */
export function deriveInvitePrefix(name: string): string {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    const initials = normalizeInvitePrefix(words.map((w) => w[0] || "").join(""));
    if (initials.length >= 2) return initials.slice(0, 3);
  }
  const cleaned = normalizeInvitePrefix(name);
  if (cleaned.length >= 2) return cleaned.slice(0, 3);
  return (cleaned || "CO").padEnd(2, "X").slice(0, 3);
}

/**
 * Ordered prefix candidates: preferred → 3 letters → 4 from company name → longer → numbered.
 * Never invents a duplicate in this list; caller still checks DB uniqueness.
 */
export function invitePrefixCandidates(preferred: string, companyName?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const n = normalizeInvitePrefix(raw);
    if (n.length < 2 || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };

  const preferredN = normalizeInvitePrefix(preferred);
  if (preferredN.length >= 2) push(preferredN);

  const nameSource = String(companyName || "").trim() || preferred;
  const cleaned = normalizeInvitePrefix(nameSource);
  const words = String(nameSource || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // 3 then 4 then 5 then 6 letters from the company name (Harsh: MCR → then 4 letters if taken)
  for (const len of [3, 4, 5, 6]) {
    if (cleaned.length >= len) push(cleaned.slice(0, len));
  }

  if (words.length >= 2) {
    const initials = normalizeInvitePrefix(words.map((w) => w[0] || "").join(""));
    push(initials.slice(0, 3));
    push(initials.slice(0, 4));
    const first = normalizeInvitePrefix(words[0] || "");
    if (first.length >= 2) {
      push((first.slice(0, 2) + initials.slice(1)).slice(0, 3));
      push((first.slice(0, 3) + initials.slice(1)).slice(0, 4));
      push((first.slice(0, 2) + initials.slice(1)).slice(0, 4));
    }
  }

  // Last resort: numbered variants of the 3-letter base — still globally unique when checked
  const base =
    (preferredN.length >= 2 ? preferredN : cleaned).slice(0, 3) ||
    deriveInvitePrefix(nameSource) ||
    "CO";
  for (let i = 2; i <= 99; i += 1) {
    const num = String(i);
    const head = base.slice(0, Math.max(2, 6 - num.length));
    push(`${head}${num}`);
  }

  return out;
}

/**
 * Allocate a globally unique company invite prefix.
 * Tries 3-letter preferred, then 4+ letters from company name, never reuses an existing prefix.
 */
export async function ensureUniqueInvitePrefix(
  candidate: string,
  excludeCompanyId?: string,
  companyName?: string
): Promise<string> {
  const candidates = invitePrefixCandidates(candidate, companyName);
  if (!candidates.length) {
    candidates.push("CO");
  }

  for (const tryPrefix of candidates) {
    const query: Record<string, unknown> = { invitePrefix: tryPrefix };
    if (excludeCompanyId) {
      query.id = { $ne: excludeCompanyId };
    }
    const exists = await Company.findOne(query).select("_id").lean();
    if (!exists) return tryPrefix;
  }
  throw new Error("Could not allocate a unique invite prefix");
}

export async function ensureCompanyDefaults(companyId: string): Promise<void> {
  const [alerts, billing, company] = await Promise.all([
    AlertConfig.findOne({ companyId }),
    BillingPlan.findOne({ companyId }),
    Company.findOne({ id: companyId }).exec(),
  ]);
  await Promise.all([
    alerts
      ? Promise.resolve()
      : AlertConfig.create({
          companyId,
          delivery: "both",
          threshold: "daily_digest",
          mutedPolicies: [],
          mutedEmployees: [],
        }),
    billing
      ? Promise.resolve()
      : BillingPlan.create({
          companyId,
          plan: "Basic",
          billingCycle: "monthly",
          nextRenewal: dayjs().add(1, "month").format("YYYY-MM-DD"),
          licenses: 10,
          headcount: 0,
        }),
  ]);

  if (company && !normalizeInvitePrefix(company.invitePrefix || "")) {
    const seed =
      company.id === DEMO_COMPANY_ID ? DEMO_INVITE_PREFIX : deriveInvitePrefix(company.name);
    const prefix = await ensureUniqueInvitePrefix(seed, company.id, company.name);
    company.invitePrefix = prefix;
    await company.save();
  }
}

export async function createCompanyRecord(input: {
  id?: string;
  name: string;
  invitePrefix?: string;
  companySize?: string;
  companyType?: string;
  monthlySpend?: string;
  ownerEmail: string;
}): Promise<string> {
  const id = input.id || newCompanyId();
  const existing = await Company.findOne({ id }).exec();
  if (existing) {
    if (!normalizeInvitePrefix(existing.invitePrefix || "")) {
      const seed =
        input.invitePrefix ||
        (id === DEMO_COMPANY_ID
          ? DEMO_INVITE_PREFIX
          : deriveInvitePrefix(input.name || existing.name));
      const prefix = await ensureUniqueInvitePrefix(seed, id, input.name || existing.name);
      existing.invitePrefix = prefix;
      await existing.save();
    }
    await ensureCompanyDefaults(id);
    return id;
  }

  const seed =
    input.invitePrefix ||
    (id === DEMO_COMPANY_ID ? DEMO_INVITE_PREFIX : deriveInvitePrefix(input.name));
  const invitePrefix = await ensureUniqueInvitePrefix(seed, undefined, input.name);

  await Company.create({
    id,
    name: input.name.trim() || "Company",
    invitePrefix,
    companySize: input.companySize || "",
    companyType: input.companyType || "",
    monthlySpend: input.monthlySpend || "",
    ownerEmail: input.ownerEmail.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  });
  await ensureCompanyDefaults(id);
  return id;
}

/** Ensure an admin (and linked auth user) has a company workspace. */
export async function ensureAdminCompany(
  authUser: IAuthUser,
  admin?: IAdminUser | null
): Promise<string> {
  const existing =
    (admin && (admin as IAdminUser & { companyId?: string }).companyId) ||
    (authUser as IAuthUser & { companyId?: string }).companyId;
  if (existing) {
    await ensureCompanyDefaults(existing);
    if (admin && !(admin as { companyId?: string }).companyId) {
      admin.set("companyId", existing);
      await admin.save();
    }
    if (!(authUser as { companyId?: string }).companyId) {
      authUser.set("companyId", existing);
      await authUser.save();
    }
    return existing;
  }

  const companyId = await createCompanyRecord({
    name: String(authUser.companyName || "Company"),
    companySize: authUser.companySize,
    companyType: authUser.companyType,
    monthlySpend: authUser.monthlySpend,
    ownerEmail: authUser.email,
  });

  authUser.set("companyId", companyId);
  await authUser.save();
  if (admin) {
    admin.set("companyId", companyId);
    await admin.save();
  }
  return companyId;
}

export function companyFilter(companyId: string | undefined): { companyId: string } | Record<string, never> {
  if (!companyId) return {};
  return { companyId };
}

export async function getCompanyInvitePrefix(companyId: string): Promise<string> {
  const company = await Company.findOne({ id: companyId }).exec();
  if (!company) throw new Error("Company not found");
  const existing = normalizeInvitePrefix(company.invitePrefix || "");
  if (existing.length >= 2) return existing;
  const seed =
    companyId === DEMO_COMPANY_ID ? DEMO_INVITE_PREFIX : deriveInvitePrefix(company.name);
  const prefix = await ensureUniqueInvitePrefix(seed, companyId, company.name);
  company.invitePrefix = prefix;
  await company.save();
  return prefix;
}
